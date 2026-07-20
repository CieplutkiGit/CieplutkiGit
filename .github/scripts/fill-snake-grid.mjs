import { readFile, writeFile } from "node:fs/promises";

const files = process.argv.slice(2);

if (files.length === 0) {
  throw new Error("Pass at least one generated snake SVG.");
}

const columns = 53;
const rows = 7;
const preRoll = 4;
const route = [];

for (let row = 0; row < rows; row += 1) {
  const columnOrder = Array.from({ length: columns }, (_, index) =>
    row % 2 === 0 ? index : columns - index - 1,
  );

  for (const column of columnOrder) {
    route.push({ column, row });
  }
}

const travelPath = [
  ...Array.from({ length: preRoll }, (_, index) => ({
    column: index - preRoll,
    row: 0,
  })),
  ...route,
  ...Array.from({ length: 4 }, (_, index) => ({
    column: columns + index,
    row: rows - 1,
  })),
];

const routeStepByCell = new Map(
  route.map(({ column, row }, index) => [`${column},${row}`, index]),
);

const percentage = (step) =>
  ((step / (travelPath.length - 1)) * 100).toFixed(3);

const snakeKeyframes = Array.from({ length: 4 }, (_, segment) => {
  const frames = travelPath
    .map((_, step) => {
      const position = travelPath[Math.max(0, step - segment)];
      return `${percentage(step)}%{transform:translate(${position.column * 16}px,${position.row * 16}px)}`;
    })
    .join("");

  return `@keyframes extraRoute${segment}{${frames}}.s.s${segment}{animation-name:extraRoute${segment}}`;
}).join("");

const gridCube = /<rect class="c( c[0-9a-z]+)?" x="(\d+)" y="(\d+)" rx="2" ry="2"\/>/g;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const cubeKeyframes = [];
  let addedCubes = 0;
  let edibleCubes = 0;

  const animated = source.replace(
    gridCube,
    (cube, contributionClass = "", xValue, yValue) => {
      const column = (Number(xValue) - 2) / 16;
      const row = (Number(yValue) - 2) / 16;
      const score = (column * 37 + row * 61 + column * row * 7 + 13) % 100;
      const isRealContribution = contributionClass.length > 0;
      const isExtraCube = !isRealContribution && score < 25;

      if (!isRealContribution && !isExtraCube) {
        return cube;
      }

      if (isExtraCube) {
        addedCubes += 1;
      }

      const routeStep = routeStepByCell.get(`${column},${row}`);
      const eatAt = preRoll + routeStep;
      const eatStart = percentage(eatAt);
      const eatEnd = percentage(eatAt + 0.8);
      const level = (score % 4) + 1;
      const animationName = `eatCube${edibleCubes}`;

      cubeKeyframes.push(
        `@keyframes ${animationName}{0%,${eatStart}%{fill:var(--c${level})}${eatEnd}%,100%{fill:var(--ce)}}`,
      );
      edibleCubes += 1;

      return cube.replace(
        'rx="2"',
        `style="fill:var(--c${level});animation-name:${animationName}" data-edible-cube="true" rx="2"`,
      );
    },
  );

  const result = animated.replace(
    "</style>",
    `${cubeKeyframes.join("")}${snakeKeyframes}</style>`,
  );

  await writeFile(file, result);
  console.log(
    `${file}: added ${addedCubes} extra cubes; ${edibleCubes} total edible cubes`,
  );
}
