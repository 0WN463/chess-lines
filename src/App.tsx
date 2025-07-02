import { useState } from 'react'

import { Chess, DEFAULT_POSITION } from 'chess.js';
import { Chessboard } from 'react-chessboard';

import yaml from "js-yaml";

const ponziani = `
e4 e5 Nf3 Nc6 c3:
  - Bc5 d4 exd4 cxd4 Bb4+ Nc3 d6 d5 Ne5 Qa4+
  - d6 d4 Nf6 h3:
    - Be6 d5
    - Nxe4 d5
`

type Tree = {value: string, children: Tree[]};

const strToTree = (s: string, initialChildren?: Tree[]) => {
	return s.split(" ").toReversed().reduce((acc: Tree | null, v: string) => !acc ? {value: v, children: initialChildren} : {value: v, children: [acc]}, null)
}

const makeTree = (s: Object) => {
	if (typeof s === 'string') {
		return strToTree(s);
	}
	const k = Object.keys(s)[0];

	const children = Object.values(s)[0].map(makeTree);

	const tree = strToTree(k, children);

	return tree;
}

const App = () => {
	const [game, setGame] = useState(DEFAULT_POSITION);
	const [lines, setLines] = useState(ponziani);
	const [tree, setTree] = useState(makeTree(yaml.load(lines)));

	const chess = new Chess(game);
	let move = null

	try {
		console.log(chess.ascii());
		move = chess.move(tree.value);
	} catch {
	}

	const options =  {
		arrows: move ? [{ startSquare: move.from, endSquare: move.to, color: "red"}] : [],
		position: game,
	}

	const onNextClicked = () => {
		setTree(tree.children[0]);
		setGame(chess.fen());
	}

	return (
		<div className="w-1/2 flex gap-6">
		<Chessboard
		options={options}
		/>
		<textarea className="w-full" value={lines}/>
		<button className="border-4" onClick={onNextClicked} >Next</button>
		</div>
	)
}

export default App
