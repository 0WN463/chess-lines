const TABLE = {
  "\n": "11000",
  " ": "0",
  "+": "1101011",
  "-": "11001",
  "0": "111110000",
  "1": "11010100",
  "2": "111110001",
  "3": "11111001",
  "4": "11100",
  "5": "10111",
  "6": "10100",
  "7": "110100",
  "8": "10110100",
  ":": "101100",
  "?": "11111010",
  B: "111100",
  K: "1011011110",
  N: "11011",
  O: "10110101",
  Q: "111111",
  R: "10110110",
  a: "11111011",
  b: "111101",
  c: "10101",
  d: "1000",
  e: "11101",
  f: "11010101",
  g: "1011011111",
  h: "101101110",
  x: "1001",
} as const;

const encode = (str: string) => {
  return str
    .split("")
    .map((c) => c in TABLE && TABLE[c])
    .join("");
};

const decode = (bitString: string) => {
  const codeToChar = Object.fromEntries(
    Object.entries(TABLE).map(([char, code]) => [code, char]),
  );

  return bitString
    .split("")
    .reduce(
      ({ buffer, output }, bit) => {
        const nextBuffer = buffer + bit;
        if (codeToChar[nextBuffer]) {
          return { buffer: "", output: [...output, codeToChar[nextBuffer]] };
        }
        return { buffer: nextBuffer, output };
      },
      { buffer: "", output: [] },
    )
    .output.join("");
};

const bitStringToBase64 = (bitString: string) => {
  const padded = bitString.padEnd(Math.ceil(bitString.length / 8) * 8, "0");

  return encodeURIComponent(
    btoa(
      padded
        .match(/.{8}/g)
        .map((byte) => String.fromCharCode(parseInt(byte, 2)))
        .join(""),
    ),
  );
};

const base64ToBitString = (base64: string) => {
  return atob(decodeURIComponent(base64))
    .split("")
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
};

export const compress = (s: string) => bitStringToBase64(encode(s));
export const decompress = (s: string) => decode(base64ToBitString(s));
