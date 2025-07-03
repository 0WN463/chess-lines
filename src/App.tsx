import { useState } from "react";

import { Chess, DEFAULT_POSITION } from "chess.js";
import { Chessboard } from "react-chessboard";

import yaml from "js-yaml";

const ponziani = `
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
        - d5 exd6 Bf5 Nd2
        - Nc5 d4:
          - Ne6 d5 Nd4 Nxd4 Nxd4 Qe4
          - Qe7 cxd4 d6 Bb5 dxe5 dxe5 Ng4 0-0 Nxe5 Nxe5 Qxe5 Re1
      - Nd5 Qb3 Nb6 cxd4 d6 Bb5 Bb4+ Qxb4
    - Nxe4 d5 Ne7 Nxe5:
      - d6? Bb5+:
        - Bd7 Bxd7 Qxd7 Nxd7
        - c6 dxc6:
          - dxe5 cxb7+ Bd7 bxa8Q
          - bxc6 Nxc6 Nxc6 Bxc6+ Bd7 Bxe4 Qe7 O-O Qxe4 Re1
`;

type Tree = { value: string; children: Tree[] };
type RootedTree = { children: Tree[] };

const strToTree = (s: string, initialChildren?: Tree[]) => {
  return s
    .split(" ")
    .toReversed()
    .reduce(
      (acc: Tree | null, v: string) =>
        !acc
          ? { value: v, children: initialChildren }
          : { value: v, children: [acc] },
      null,
    );
};

const makeRootedTree = (s: Object) => {
  if (!s) return null;
  const tree = makeTree(s);

  return { children: [tree] };
};

const makeTree = (s: Object) => {
  if (typeof s === "string") {
    return strToTree(s);
  }
  const k = Object.keys(s)[0];

  const children = Object.values(s)[0].map(makeTree);

  const tree = strToTree(k, children);

  return tree;
};

const moveToCoords = (position: string, move: string) => {
  const chess = new Chess(position);

  try {
    const { to, from } = chess.move(move.replace("?", ""));
    return { startSquare: from, endSquare: to, isBlunder: move.includes("?") };
  } catch {
    console.log("invalid move", move, position, DEFAULT_POSITION);
  }
};

const loadYaml = (s: string) => {
  try {
    return yaml.load(s);
  } catch {
    console.log("invalid yaml");
    return null;
  }
};

const App = () => {
  const [lines, setLines] = useState(ponziani);

  const yaml = loadYaml(lines);
  const [history, setHistory] = useState([
    {
      tree: makeRootedTree(yaml),
      position: DEFAULT_POSITION,
    },
  ]);

  if (!yaml)
    return (
      <main className="w-4/5">
        <div className="flex gap-6">
          <Chessboard key="invalid" />
          <textarea
            key="invalid-text"
            className="w-full bg-red-300"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
          />
        </div>
      </main>
    );

  const { tree, position } = history.at(-1);

  let moves = tree.children?.map((child) =>
    moveToCoords(position, child.value),
  );

  const options = {
    arrows:
      moves?.map((m) => ({ ...m, color: m.isBlunder ? "red" : "green" })) ?? [],
    position,
  };

  const onMoveClicked = (index: number) => {
    const chess = new Chess(position);
    if (tree?.children.length) {
      chess.move(tree.children[index].value.replace("?", ""));
      setHistory([
        ...history,
        { tree: tree.children[index], position: chess.fen() },
      ]);
    }
  };

  const onBack = () => {
    setHistory(history.slice(0, -1));
  };

  return (
    <main className="w-3/5">
      <div className="flex gap-6 mb-6">
        <Chessboard key="valid" options={options} />
        <textarea
          key="valid-text"
          className="w-full"
          value={lines}
          onChange={(e) => setLines(e.target.value)}
        />
      </div>
      <div className="flex w-full gap-3">
        {tree.children?.map((c, i) => (
          <button
            key={i}
            className="border-4 rounded p-2 basis-0 grow max-w-xs"
            onClick={() => onMoveClicked(i)}
          >
            {c.value}
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
    </main>
  );
};

export default App;
