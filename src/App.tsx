import { useState, useRef, useLayoutEffect } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { Chessboard } from "react-chessboard";
import toast, { Toaster } from "react-hot-toast";

import NavigationButtons from "./NavigationButtons";
import Support from "./Support";
import { compress, decompress } from "./Huffman";

import yaml from "js-yaml";

const ponzianiLine = `
e4 e5 Nf3 Nc6 c3:
  - Bc5 d4 exd4 cxd4 Bb4+ Nc3 d6 d5 Ne5 Qa4+
  - d6 d4 Nf6 h3:
    - Be6? d5
    - Nxe4? d5 Ne7 Qa4+
  - d5 Qa4:
    - Bd7 exd5 Nd4 Qd1
    - dxe4 Nxe5 Qd5 Nxc6:
      - Qxc6? Bb5
      - bxc6 Bc4
  - Nf6 d4:
    - exd4 e5:
      - Ne4 Qe2:
        - d5 exd6 Bf5 Nbd2
        - Nc5 cxd4:
          - Ne6 d5:
            - Ncd4 Nxd4 Nxd4 Qe4
            - Ned4 Nxd4 Nxd4 Qe4
      - Qe7 cxd4 d6 Bb5 dxe5 dxe5 Ng4 0-0 Nxe5 Nxe5 Qxe5 Re1
      - Nd5 Qb3 Nb6 cxd4 d5 Bb5 Bb4+? Qxb4
`;

const nextPos = (pos: string, move: string) => {
  const chess = new Chess(pos);
  try {
    chess.move(move.replace("?", ""));

    return chess.fen();
  } catch {
    console.error("invalid", move);
    return null;
  }
};

const makeRootedStateTree = (t: RootedMoveTree) => {
  const children = t.children.map((c) => makeStateTree(c, DEFAULT_POSITION));

  if (children.some((c) => c === null)) return null;

  return { children: children as StateTree[] };
};

const makeStateTree = (t: MoveTree, pos: string): StateTree | null => {
  const next = nextPos(pos, t.value);

  if (!next) return null;

  const children = t.children.map((c) => makeStateTree(c, next));

  if (children.some((c) => c === null)) return null;

  return { move: t.value, position: next, children: children as StateTree[] };
};

type MoveTree = { value: string; children: MoveTree[] };
type RootedMoveTree = { children: MoveTree[] };
type StateTree = { move: string; position: string; children: StateTree[] };
type RootedStateTree = { children: StateTree[] };

const strToTree = (s: string, initialChildren?: MoveTree[]) => {
  return s
    .split(" ")
    .toReversed()
    .reduce(
      (acc: MoveTree | null, v: string) =>
        !acc
          ? { value: v, children: initialChildren ?? [] }
          : { value: v, children: [acc] },
      null,
    );
};

const makeRootedTree = (s: object) => {
  if (!s) return null;
  const tree = makeTree(s);

  return { children: [tree] };
};

const getPerspective = (
  t: RootedMoveTree,
  candidate?: "white" | "black",
  prev?: "white" | "black",
): "white" | "black" | undefined => {
  if (t.children.length === 0) return candidate;

  if (!prev) {
    const perspectives = t.children.map((c) =>
      getPerspective(c, undefined, "black"),
    );

    if (!perspectives.every((p) => p === perspectives[0])) return undefined;

    return perspectives[0];
  }

  if (t.children.length === 1)
    return getPerspective(
      t.children[0],
      candidate,
      prev === "white" ? "black" : "white",
    );

  if (prev === candidate) return undefined;

  const perspectives = t.children.map((c) =>
    getPerspective(
      c,
      prev === "white" ? "black" : "white",
      prev === "white" ? "black" : "white",
    ),
  );

  if (!perspectives.every((p) => p === perspectives[0])) return undefined;

  return perspectives[0];
};

const makeTree = (s: object) => {
  if (typeof s === "string") {
    return strToTree(s);
  }
  const k = Object.keys(s)[0];
  const children = Object.values(s)?.[0]?.map(makeTree);

  const tree = strToTree(k, children);

  return tree;
};

// Assumes move has been validated
const moveToCoords = (position: string, move: string) => {
  const chess = new Chess(position);

  const { to, from } = chess.move(move.replace("?", ""));
  return { startSquare: from, endSquare: to, isBlunder: move.includes("?") };
};

const loadYaml = (s: string) => {
  try {
    return yaml.load(s);
  } catch {
    console.error("invalid yaml");
    return null;
  }
};

const Tree = ({
  rootedStateTree,
  currState,
  onStateSelected,
}: {
  rootedStateTree: RootedStateTree;
  currState?: StateTree;
  onStateSelected: (_: StateTree) => void;
}) => {
  const tree = rootedStateTree;

  const straight = (
    tree: StateTree | RootedStateTree,
    totalIndent: number,
  ): React.ReactNode => {
    const ts: StateTree[] = [];
    let t = tree;
    while (t.children.length === 1) {
      if ("move" in t) ts.push(t);
      t = t.children[0];
    }

    if ("move" in t) ts.push(t);

    return (
      <>
        <div>
          {Array.from({ length: totalIndent }).map((_, i) => (
            <span key={`${totalIndent}-${i}`} className="p-4" />
          ))}
          {ts.map((t) => (
            <span
              className={`my-4 mx-2 p-1 rounded-full hover:bg-sky-400 hover:text-white ${currState?.position === t.position ? "bg-sky-500 text-white" : ""}`}
              onClick={() => onStateSelected(t)}
              key={`${totalIndent}-${t.move}`}
            >
              {t.move}
            </span>
          ))}
        </div>
        {t.children.map((c) => straight(c, totalIndent + 1))}
      </>
    );
  };

  return (
    <div>
      <h2 className="font-bold">Lines</h2>
      {straight(tree, 0)}
    </div>
  );
};

const App = () => {
  const query = new URLSearchParams(window.location.search);
  const params = query.get("lines") ?? "";
  const lines = failable(() => decompress(params)) ?? "";
  const [input, setInput] = useState(lines);
  const [hoverMove, setHoverMove] = useState("");

  const textArea = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{ start?: number; end?: number }>({});

  const yaml = loadYaml(input);

  const rootedTree = failable(() => makeRootedTree(yaml as object));

  // @ts-expect-error
  const rootedStateTree = rootedTree ? makeRootedStateTree(rootedTree) : null;

  const [detailOpen, setDetailOpen] = useState(rootedStateTree ? false : true);
  const [history, setHistory] = useState<StateTree[]>([]);
  const currState = history.at(-1);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    selectionRef.current = {
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
    };

    setInput(e.target.value);
  };

  useLayoutEffect(() => {
    if (document.activeElement === textArea.current) {
      return;
    }

    setHistory([]);

    const textarea = textArea.current;
    textarea?.focus();
    const { start, end } = selectionRef.current;

    if (textarea && start != null && end != null) {
      textarea.setSelectionRange(start, end);
    }
  }, [input]);

  if (!yaml || !rootedStateTree)
    return (
      <main className="w-full">
        <div className="m-2 md:flex gap-6 mb-6">
          <div className="w-full md:w-100 md:flex-shrink-0">
            <div className="aspect-square">
              <Chessboard key="valid" />
            </div>
          </div>
          <div className="md:w-full">
            <details open={detailOpen} onClick={(e) => e.preventDefault()}>
              <summary onClick={() => setDetailOpen(!detailOpen)}>
                Lines Input
              </summary>
              <textarea
                ref={textArea}
                className="w-full bg-red-200"
                rows={20}
                value={input}
                onChange={handleChange}
                placeholder={ponzianiLine}
              />
            </details>
          </div>
        </div>
        <Support />
      </main>
    );

  const tree: StateTree | RootedStateTree = currState ?? rootedStateTree;
  const currPos = currState?.position ?? DEFAULT_POSITION;
  const moves = tree.children?.map((child) => ({
    ...moveToCoords(currPos, child.move),
    move: child.move,
  }));

  const options = {
    arrows:
      moves?.map((m) => ({
        ...m,
        color: m.move === hoverMove ? "yellow" : m.isBlunder ? "red" : "green",
      })) ?? [],
    position: currPos,
    allowDragging: false,
    showNotation: true,
    boardOrientation:
      (rootedTree && getPerspective(rootedTree as RootedMoveTree)) ?? "white",
  };

  const onMoveClicked = (index: number) => {
    setHistory([...history, tree.children[index]]);
  };

  const onBack = () => {
    setHistory(history.slice(0, -1));
  };

  return (
    <main className="w-full">
      <div className="m-2 md:flex gap-6 mb-6">
        <div className="w-full md:w-100 md:flex-shrink-0">
          <div className="aspect-square">
            <Chessboard key="valid" options={options} />
          </div>
          <NavigationButtons
            className="flex w-full gap-3 pt-4"
            options={tree.children.map((c) => c.move)}
            onBack={onBack}
            onClick={onMoveClicked}
            onHover={setHoverMove}
            withBack={history.length > 1}
          />
        </div>
        <div className="md:w-full">
          <details open={detailOpen} onClick={(e) => e.preventDefault()}>
            <summary onClick={() => setDetailOpen(!detailOpen)}>
              Lines Input
            </summary>
            <textarea
              ref={textArea}
              className="w-full bg-gray-200"
              rows={20}
              value={input}
              onChange={handleChange}
            />
            <button
              className="border-2 rounded px-2 m-2 hover:bg-gray-100"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.host}?lines=${compress(input)}`,
                );
                toast("Link copied to clipboard!");
              }}
            >
              Copy link
            </button>
          </details>
          <Tree
            rootedStateTree={rootedStateTree}
            currState={currState}
            onStateSelected={(s) => setHistory([...history, s])}
          />
        </div>
      </div>
      <Toaster />
      <Support />
    </main>
  );
};

const failable = <T,>(f: () => T): T | null => {
  try {
    return f();
  } catch {
    return null;
  }
};

export default App;
