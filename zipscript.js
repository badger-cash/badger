const zip = require("bestzip");
const pjson = require("./package.json");

const { version } = pjson;

zip({
  cwd: "dist",
  source: "*",
  destination: `../builds/badger-v${version}.zip`
})
  .then(() => {
    console.log(`version ${version} successfully created in /builds`);
  })
  .catch(err => {
    console.error(err.stack);
    process.exit(1);
  });
