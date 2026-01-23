# Third-Party Notices

This document contains attributions and license information for third-party components used in CtxRun.

## Project License

CtxRun is distributed under the **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](LICENSE) for full details.

---

## Open Source Libraries

### Frontend Dependencies (JavaScript/TypeScript)

| Package | License | Author |
|---------|---------|--------|
| **React** | MIT | Meta Platforms, Inc. |
| **Zustand** | MIT | pmndrs |
| **Monaco Editor** | MIT | Microsoft Corporation |
| **Tailwind CSS** | MIT | Tailwind Labs |
| **Vite** | MIT | Vue.js Team |
| **Framer Motion** | MIT | Framer Motion, Inc. |
| **Lucide React** | MIT | Lucide Contributors |
| **React Markdown** | MIT | Espen Hovlandsdal |
| **Monaco Editor React** | MIT | Suren A. Chilingaryan |
| **Tailwind Merge** | MIT | dcastil |
| **Class Variance Authority** | MIT | Mateusz Burzyński |
| **UUID** | MIT | Robert Kieffer |
| **Diff** | BSD-3-Clause | Kevin Decker |

### Backend Dependencies (Rust)

| Crate | License | Description |
|-------|---------|-------------|
| **tauri** | MIT OR Apache-2.0 | Core application framework |
| **rusqlite** | MIT | SQLite bindings |
| **sysinfo** | MIT | System information |
| **git2** | MIT OR Apache-2.0 | Git bindings |
| **reqwest** | MIT OR Apache-2.0 | HTTP client |
| **tokio** | MIT | Async runtime |
| **serde** | MIT OR Apache-2.0 | Serialization |
| **refinery** | MIT OR Apache-2.0 | Database migrations |
| **gitleaks** | MIT | Secrets detection |
| **regex** | MIT OR Apache-2.0 | Regular expressions |

---

## Data Sources

The following open data projects are partially sourced in this application:

| Project | License | Description |
|---------|---------|-------------|
| **tldr-pages** | CC BY 4.0 | Simplified command line documentation |
| **Awesome ChatGPT Prompts** | CC0 1.0 | Curated AI prompts collection |

> **Note**: The tldr-pages data is licensed under CC BY 4.0. When using or distributing command documentation from this project, please attribute appropriately. See https://github.com/tldr-pages/tldr for details.

---

## Font and Icon Resources

| Resource | License | Description |
|----------|---------|-------------|
| **Lucide Icons** | MIT | SVG icon set |

---

## Where to Find Full License Texts

### Frontend Dependencies
Full license texts for all npm packages are available in the `node_modules/*/LICENSE` directories of the project source code.

To view all licenses for frontend dependencies:
```bash
# View a summary
npm list --depth=0

# Check specific package license
cat node_modules/[package-name]/LICENSE
```

### Backend Dependencies
Rust crate license information is documented in:
- `src-tauri/Cargo.toml` - Direct dependencies
- `src-tauri/Cargo.lock` - All transitive dependencies with licenses

To check backend dependencies:
```bash
cd src-tauri
cargo license --summary
```

---

## Acknowledgments

We thank all the maintainers and contributors of the open source projects that make CtxRun possible.

---

*This document was last updated on 2026-01-23.*
