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

## Build

```bash
cmake -S . -B build
cmake --build build --config Release
```

## Compile

```bash
tekst main.tk
tekst main.tk -o hello
tekst main.tk --run
tekst main.tk --emit-ir
```

## Documentation

The project website contains the full documentation, including getting started, language basics, advanced topics, compiler internals, and the language reference.

## Contributing

See the contributing guide for the compiler architecture, development workflow, build setup, and project conventions.
