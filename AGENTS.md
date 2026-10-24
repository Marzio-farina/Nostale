<!-- graphify-local:start -->
## Code navigation with Graphify

For questions spanning files, start with `python .graphify/run.py query "<symbols or question>" --budget 1500`.
Use `path "A" "B"`, `explain "Symbol"`, or `affected "Symbol"` through the same runner for focused relationships.
If the graph is missing, the runner builds it. After source changes, a pull, or a branch switch, run `python .graphify/run.py refresh` before relying on it.
Open the specific source files and lines returned to verify behavior before editing. If a query has no useful match, use targeted file search; unsupported files and inferred edges need source verification.
Avoid loading the whole graph or report for a narrow question. Graph files are generated local artifacts and should stay untracked.
The runner pins Graphify 0.9.61, uses local code parsing, and disables LLM community labels. Setup and commands are documented in `.graphify/README.md`.
<!-- graphify-local:end -->
