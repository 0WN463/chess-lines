import { useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { Chessboard } from "react-chessboard";

import yaml from "js-yaml";

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
  if (!t) return null;
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
  onStateSelected,
}: {
  rootedStateTree: RootedStateTree;
  onStateSelected: (_: StateTree) => void;
}) => {
  const tree = rootedStateTree;

  const straight = (tree: StateTree, totalIndent: number) => {
    let ts = [];
    let t = tree;
    while (t.children.length === 1) {
      ts.push(t);
      t = t.children[0];
    }

    ts.push(t);

    return (
      <>
        <div>
          {Array.from({ length: totalIndent }).map((_, i) => (
            <span key={`${totalIndent}-${i}`} className="p-4" />
          ))}
          {ts.map((t) => (
            <span
              className="my-4 mx-2 p-1 rounded-full hover:bg-sky-700"
              onClick={() => onStateSelected(t)}
            >
              {t.move}
            </span>
          ))}
        </div>
        {t.children.map((c) => straight(c, totalIndent + 1))}
      </>
    );
  };

  return <div>{straight(tree, 0)}</div>;
};

const App = () => {
  const query = new URLSearchParams(window.location.search);
  const params = query.get("lines") ?? "";
  const lines = failable(() => atob(params)) ?? "";
  const [input, setInput] = useState(lines);

  const yaml = loadYaml(input);

  const rootedTree = failable(() => makeRootedTree(yaml));

  const rootedStateTree = makeRootedStateTree(rootedTree);
  const [history, setHistory] = useState<StateTree[]>([]);
  const currState = history.at(-1);

  if (!yaml || !rootedStateTree)
    return (
      <main className="w-3/5">
        <div className="flex gap-6 mb-6">
          <Chessboard key="invalid" />
          <textarea
            key="valid-text"
            className="w-full bg-red-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
      </main>
    );

  const tree: StateTree | RootedStateTree = currState ?? rootedStateTree;
  const currPos = currState?.position ?? DEFAULT_POSITION;
  const moves = tree.children?.map((child) =>
    moveToCoords(currPos, child.move),
  );

  const options = {
    arrows:
      moves?.map((m) => ({ ...m, color: m.isBlunder ? "red" : "green" })) ?? [],
    position: currPos,
    allowDragging: false,
  };

  const onMoveClicked = (index: number) => {
    setHistory([...history, tree.children[index]]);
  };

  const onBack = () => {
    setHistory(history.slice(0, -1));
  };

  return (
    <main className="w-full">
      <div className="flex gap-6 mb-6">
        <div className="size-1/2">
          <Chessboard key="valid" options={options} />
          <div className="flex w-full gap-3 pt-4">
            {tree.children?.map((c, i) => (
              <button
                key={i}
                className="border-4 rounded p-2 basis-0 grow max-w-xs"
                onClick={() => onMoveClicked(i)}
              >
                {c.move}
              </button>
            ))}
            {history.length > 1 && (
              <button
                className="border-4 p-2 basis-0 grow max-w-xs"
                onClick={onBack}
              >
                Back
              </button>
            )}
          </div>
        </div>
        <div className="w-full">
          <details>
            <summary>Lines Input</summary>
            <textarea
              key="valid-text"
              className="w-full bg-gray-200"
              rows={20}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </details>
          <Tree
            rootedStateTree={rootedStateTree}
            onStateSelected={(s) => setHistory([...history, s])}
          />
        </div>
      </div>
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
