# Tekst

Tekst is an indentation-based programming language with a native LLVM compiler and a compact syntax.

## Current toolchain

Tekst 2.1.3 uses a native compilation pipeline:

```text
Tekst source
    ↓
Lexer
    ↓
Parser
    ↓
AST
    ↓
LLVM IR
    ↓
LLVM / Clang
    ↓
native executable
```

The current compiler includes native LLVM lowering, explicit pointer and memory operations, local modules and package resolution, and a CMake-based C++17 build workflow.

Modules can be loaded with `use module` or selected with `from module use name`. The older `import` spelling remains supported for compatibility.

## Build

```bash
cmake -S . -B build
cmake --build build --config Release
```

The build places the compiler executables in `build/release/` (including `tekst.exe` and `tk.exe` on Windows).

## Compile

```bash
tekst main.tk
tekst main.tk -o hello
tekst main.tk --run
tekst main.tk --emit-ir
```

## Documentation

The [project website](https://tekst.ayaan.is-a.dev/) contains the full documentation, including getting started, language basics, advanced topics, compiler internals, and the language reference. Try Tekst in the [browser playground](https://tekst.ayaan.is-a.dev/playground/).

## Contributing

See the contributing guide for the compiler architecture, development workflow, build setup, and project conventions.
