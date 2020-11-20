import { fail, message, warn } from "danger"
const dangerJest = require('danger-plugin-jest').default;
const fs = require('fs/promises');
const path = require('path');
const glob = require('glob')

const lintPath = path.join(__dirname, 'lint-results.json');
function lint() {
  return fs.readFile(lintPath).then(file => {
    const lintReport = JSON.parse(file)
    for (const { messages, filePath } of lintReport) {
      const relPath = path.relative(__dirname, filePath)
      for (const message of messages) {
        const text = `${message.message} \`${message.ruleId}\``
        if (message.severity === 2) {
          fail(text, relPath, message.line);
        } else if (message.severity === 1) {
          warn(text, relPath, message.line);
        }
      }
    }
  });
}

function coverage() {
  return fs.readFile(path.join(__dirname, 'coverage', 'coverage-summary.json')).then(file => {
    const { total } = JSON.parse(file)
    const formatCoverage = (kind, { covered, total, pct }) => `${covered} / ${total} ${kind} (${pct}%)`
    message(`Code coverage: ${
      Object.entries(total).map(([kind, cov]) => formatCoverage(kind, cov)).join(', ')
    }`)
  })
}

async function screenshotDiffs() {
  const diffImages = await new Promise((ok, fail) => {
    glob("**/__diff_output__/*.png", (err, list) => err ? fail(err) : ok(list));
  });
  if (diffImages.length === 0) return
  for (const diffPath of diffImages) {
    const diff = await fs.readFile(diffPath)
    fail(`Screenshot diff at \`${path.relative(__dirname, diffPath)}\`: <img src="data:image/png;base64, ${diff.toString('base64')}">`)
  }
}

Promise.all([
  dangerJest(),
  lint(),
  coverage(),
  screenshotDiffs()
]);
