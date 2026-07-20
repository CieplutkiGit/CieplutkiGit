import { readFile, writeFile } from "node:fs/promises";

const files = process.argv.slice(2);

if (files.length === 0) {
  throw new Error("Pass at least one generated snake SVG.");
}

const emptyCube = /<rect class="c" x="(\d+)" y="(\d+)" rx="2" ry="2"\/>/g;

for (const file of files) {
  const source = await readFile(file, "utf8");
  let addedCubes = 0;

  const decorated = source.replace(emptyCube, (cube, xValue, yValue) => {
    const column = (Number(xValue) - 2) / 16;
    const row = (Number(yValue) - 2) / 16;
    const score = (column * 37 + row * 61 + column * row * 7 + 13) % 100;

    if (score >= 62) {
      return cube;
    }

    addedCubes += 1;
    const level = (score % 4) + 1;
    return cube.replace(
      'class="c"',
      `class="c" style="fill:var(--c${level})" data-extra-cube="true"`,
    );
  });

  await writeFile(file, decorated);
  console.log(`${file}: added ${addedCubes} extra cubes`);
}
