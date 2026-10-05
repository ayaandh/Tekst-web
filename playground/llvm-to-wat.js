const DATA_BASE = 4194304;
const STACK_TOP = 29360128;

function decodeLLVMBytes(value) {
    const bytes = [];
    for (let i = 0; i < value.length; i++) {
        if (value[i] === "\\") {
            const hex = value.slice(i + 1, i + 3);
            if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
                throw new Error(`Invalid LLVM string escape: \\${hex}`);
            }
            bytes.push(parseInt(hex, 16));
            i += 2;
        } else {
            bytes.push(value.charCodeAt(i));
        }
    }
    return bytes;
}

function parseGlobals(ir) {
    const globals = [];
    const re = /@([.$A-Za-z_][.$\w-]*) = private unnamed_addr constant \[(\d+) x i8\] c"((?:\\.|[^"\\])*)"/g;
    let match;
    let offset = DATA_BASE;

    while ((match = re.exec(ir))) {
        const bytes = decodeLLVMBytes(match[3]);
        const declaredLength = Number(match[2]);
        if (bytes.length !== declaredLength) {
            throw new Error(`Invalid size for LLVM string global @${match[1]}`);
        }
        globals.push({ name: match[1], offset, bytes });
        offset += bytes.length;
    }
    return globals;
}

function parseFunctions(ir) {
    const functions = [];
    let current = null;

    for (const line of ir.split(/\r?\n/)) {
        const definition = line.match(/^define\s+(i32|ptr)\s+@([.$\w-]+)\((.*?)\)\s*\{$/);
        if (definition) {
            current = {
                result: definition[1],
                name: definition[2],
                params: definition[3],
                body: []
            };
            functions.push(current);
        } else if (current && line.trim() === "}") {
            current = null;
        } else if (current) {
            current.body.push(line);
        }
    }

    return functions;
}

function parseArgs(text) {
    const args = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "(") depth++;
        else if (text[i] === ")") depth--;
        else if (text[i] === "," && depth === 0) {
            args.push(text.slice(start, i).trim());
            start = i + 1;
        }
    }
    if (text.slice(start).trim()) args.push(text.slice(start).trim());
    return args;
}

function operand(expression) {
    const match = expression.trim().match(/^(ptr|i64|i32|i1|double)\s+(.+)$/);
    if (!match) throw new Error(`Unsupported LLVM operand: ${expression}`);

    const [, type, value] = match;
    if (value.startsWith("%")) return [`local.get $${value.slice(1)}`, type === "ptr" ? "i32" : type === "double" ? "f64" : type === "i64" ? "i64" : "i32"];
    if (type === "ptr" && value.startsWith("@")) {
        throw new Error(`Function/global pointer operand is not supported: ${expression}`);
    }
    if (type === "i1") {
        if (value !== "true" && value !== "false") throw new Error(`Invalid LLVM boolean: ${value}`);
        return [`i32.const ${value === "true" ? 1 : 0}`, "i32"];
    }
    if (type === "double") {
        if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
            throw new Error(`Invalid LLVM floating-point value: ${value}`);
        }
        return [`f64.const ${value}`, "f64"];
    }
    if (!/^-?\d+$/.test(value)) throw new Error(`Invalid LLVM integer value: ${value}`);
    return [`${type}.const ${value}`, type === "ptr" || type === "i32" ? "i32" : "i64"];
}

function runtimeSignature(name) {
    const signatures = {
        rt_none: [[], "i32"],
        rt_int: [["i64"], "i32"],
        rt_float: [["f64"], "i32"],
        rt_str: [["i32"], "i32"],
        rt_str_const_empty: [[], "i32"],
        rt_bool: [["i32"], "i32"],
        rt_add: [["i32", "i32"], "i32"],
        rt_sub: [["i32", "i32"], "i32"],
        rt_mul: [["i32", "i32"], "i32"],
        rt_div: [["i32", "i32"], "i32"],
        rt_mod: [["i32", "i32"], "i32"],
        rt_eq: [["i32", "i32"], "i32"],
        rt_ne: [["i32", "i32"], "i32"],
        rt_lt: [["i32", "i32"], "i32"],
        rt_le: [["i32", "i32"], "i32"],
        rt_gt: [["i32", "i32"], "i32"],
        rt_ge: [["i32", "i32"], "i32"],
        rt_neg: [["i32"], "i32"],
        rt_not: [["i32"], "i32"],
        rt_truth: [["i32"], "i32"],
        rt_print: [["i32"], null],
        rt_print_part: [["i32"], null],
        rt_print_space: [[], null],
        rt_print_newline: [[], null],
        rt_input: [["i32"], "i32"],
        rt_to_int: [["i32"], "i32"],
        rt_to_str: [["i32"], "i32"],
        rt_to_bool: [["i32"], "i32"],
        rt_to_float: [["i32"], "i32"],
        rt_len: [["i32"], "i32"],
        rt_index: [["i32", "i32"], "i32"],
        rt_set_index: [["i32", "i32", "i32"], null],
        rt_and: [["i32", "i32"], "i32"],
        rt_or: [["i32", "i32"], "i32"],
        rt_list_empty: [[], "i32"],
        rt_list_push: [["i32", "i32"], null],
        rt_dict_empty: [[], "i32"],
        rt_dict_set_item: [["i32", "i32", "i32"], null],
        rt_call_method_zero: [["i32", "i32"], "i32"],
        rt_call_method_one: [["i32", "i32", "i32"], "i32"],
        rt_call_method_two: [["i32", "i32", "i32", "i32"], "i32"],
        rt_range_one: [["i32"], "i32"],
        rt_range_two: [["i32", "i32"], "i32"],
        rt_range_three: [["i32", "i32", "i32"], "i32"],
        rt_alloc: [["i32"], "i32"],
        rt_free: [["i32"], null],
        rt_ref: [["i32"], "i32"],
        rt_deref: [["i32"], "i32"],
        rt_store: [["i32", "i32"], null],
        rt_ptr_add: [["i32", "i32"], "i32"],
        rt_ptr_load_int: [["i32"], "i32"],
        rt_ptr_store_int: [["i32", "i32"], null],
        rt_ptr_load_byte: [["i32"], "i32"],
        rt_ptr_store_byte: [["i32", "i32"], null],
        rt_new_object: [["i32"], "i32"],
        rt_get_attr: [["i32", "i32"], "i32"],
        rt_set_attr: [["i32", "i32", "i32"], null],
        rt_optional_attr: [["i32", "i32"], "i32"]
    };
    return signatures[name];
}

function splitBlocks(body) {
    const blocks = [];
    let current = null;
    for (const line of body) {
        const label = line.trim().match(/^([\w.$-]+):$/);
        if (label) {
            current = { label: label[1], instructions: [] };
            blocks.push(current);
        } else if (line.trim()) {
            if (!current) throw new Error("LLVM function is missing its entry block");
            current.instructions.push(line.trim());
        }
    }
    return blocks;
}

function translate(ir) {
    const globals = parseGlobals(ir);
    const functions = parseFunctions(ir);
    if (!functions.some(fn => fn.name === "main")) {
        throw new Error("LLVM IR has no main function");
    }

    const functionNames = new Set(functions.map(fn => fn.name));
    const functionIds = new Map(functions.map((fn, index) => [fn.name, index]));
    const imports = new Set();
    for (const fn of functions) {
        for (const line of fn.body) {
            for (const [, name] of line.matchAll(/@([A-Za-z_][A-Za-z0-9_]*)\(/g)) {
                if (name === "rt_print_many") {
                    imports.add("rt_print_part");
                    imports.add("rt_print_space");
                    imports.add("rt_print_newline");
                }
                else if (name === "rt_list") {
                    imports.add("rt_list_empty");
                    imports.add("rt_list_push");
                }
                else if (name === "rt_dict") {
                    imports.add("rt_dict_empty");
                    imports.add("rt_dict_set_item");
                }
                else if (name === "rt_callable" || name === "rt_call_callable") {
                    continue;
                }
                else if (name === "rt_call_method") {
                    const args = parseArgs(line.slice(line.indexOf("@rt_call_method(") + 16, line.lastIndexOf(")")));
                    const count = args.length - 3;
                    if (count < 0 || count > 2 || args.at(-1)?.trim() !== "ptr null") {
                        throw new Error("WebAssembly supports methods with up to two explicit arguments");
                    }
                    imports.add(`rt_call_method_${["zero", "one", "two"][count]}`);
                }
                else if (name === "rt_range") {
                    const args = parseArgs(line.slice(line.indexOf("@rt_range(") + 10, line.lastIndexOf(")")));
                    const count = Number(args[0]?.replace(/^i32\s+/, ""));
                    if (count < 1 || count > 3) throw new Error(`WebAssembly backend does not support range with ${count} arguments`);
                    imports.add(`rt_range_${["", "one", "two", "three"][count]}`);
                }
                else if (name.startsWith("rt_")) imports.add(name);
            }
        }
    }

    const wat = [
        "(module",
        '  (import "runtime" "memory" (memory 0))'
    ];

    for (const name of imports) {
        const signature = runtimeSignature(name);
        if (!signature) {
            throw new Error(`WebAssembly backend does not support runtime function ${name}`);
        }
        const params = signature[0].map((type, index) => `(param $p${index} ${type})`).join(" ");
        const result = signature[1] ? `(result ${signature[1]})` : "";
        wat.push(`  (import "runtime" "${name}" (func $${name} ${params} ${result}))`);
    }

    wat.push(`  (global $sp (mut i32) (i32.const ${STACK_TOP}))`);
    for (const global of globals) {
        const data = global.bytes.map(byte => `\\${byte.toString(16).padStart(2, "0")}`).join("");
        wat.push(`  (data (i32.const ${global.offset}) "${data}")`);
    }

    const indirectArities = new Set();
    for (const fn of functions) {
        const count = parseArgs(fn.params).filter(Boolean).length;
        if (count <= 4) indirectArities.add(count);
    }
    for (const count of indirectArities) {
        const params = Array.from({ length: count }, () => "i32").map(type => `(param ${type})`).join(" ");
        wat.push(`  (type $call_${count} (func ${params} (result i32)))`);
    }
    wat.push(`  (table $function_table ${functions.length} funcref)`);

    for (const fn of functions) {
        const blocks = splitBlocks(fn.body);
        if (!blocks.length) throw new Error(`Function ${fn.name} has no basic blocks`);

        const allocaOffsets = new Map();
        for (const block of blocks) {
            for (const instruction of block.instructions) {
                const alloca = instruction.match(/^%([\w.$-]+) = alloca ptr$/);
                if (alloca) allocaOffsets.set(alloca[1], allocaOffsets.size);
            }
        }

        const params = parseArgs(fn.params).filter(Boolean).map((param, index) => {
            const match = param.match(/^ptr\s+(%[\w.$-]+)$/);
            if (!match) throw new Error(`Unsupported parameter in ${fn.name}: ${param}`);
            return `(param $${match[1].slice(1)} i32)`;
        });
        const locals = new Set(["pc", "frame"]);
        for (const block of blocks) {
            for (const instruction of block.instructions) {
                for (const [, name] of instruction.matchAll(/%([\w.$-]+)/g)) locals.add(name);
            }
        }
        for (const param of params) {
            locals.delete(param.match(/\$([\w.$-]+)/)[1]);
        }

        wat.push(`  (func $${fn.name} ${params.join(" ")} (result i32)`);
        for (const name of locals) wat.push(`    (local $${name} i32)`);
        wat.push("    global.get $sp", "    local.set $frame");
        if (allocaOffsets.size) {
            wat.push(
                "    global.get $sp",
                `    i32.const ${allocaOffsets.size * 4}`,
                "    i32.sub",
                "    global.set $sp"
            );
        }
        wat.push(`    i32.const 0`, "    local.set $pc", "    block $exit", "      loop $dispatch");

        blocks.forEach((block, blockIndex) => {
            wat.push(
                `        (if (i32.eq (local.get $pc) (i32.const ${blockIndex}))`,
                "          (then"
            );
            for (const instruction of block.instructions) {
                emitInstruction(instruction, {
                    wat,
                    blocks,
                    blockIndex,
                    allocaOffsets,
                    globals,
                    functionNames,
                    functionIds,
                    indirectArities
                });
            }
            wat.push("          )", "        )");
        });

        wat.push("        br $exit", "      end", "    end", "    i32.const 0", "  )");
    }

    if (functions.length) {
        wat.push(`  (elem (i32.const 0) ${functions.map(fn => `$${fn.name}`).join(" ")})`);
    }
    wat.push('  (export "main" (func $main))', ")");
    return wat.join("\n");
}

function emitInstruction(instruction, context) {
    const { wat, blocks, allocaOffsets, globals, functionNames, functionIds, indirectArities } = context;
    const add = (...lines) => wat.push(...lines.map(line => `            ${line}`));
    const targetIndex = label => {
        const index = blocks.findIndex(block => block.label === label);
        if (index < 0) throw new Error(`Unknown LLVM block label: ${label}`);
        return index;
    };
    const branch = label => {
        add(`i32.const ${targetIndex(label)}`, "local.set $pc", "br $dispatch");
    };
    const emitCallable = (rawArgs, destination) => {
        const args = parseArgs(rawArgs);
        if (args.length !== 1) throw new Error("Invalid LLVM function reference");
        const reference = args[0].match(/^ptr @([\w.$-]+)$/);
        const functionId = reference ? functionIds.get(reference[1]) : undefined;
        if (functionId === undefined) {
            throw new Error(`WebAssembly function reference is not supported: ${args[0]}`);
        }
        add(`i32.const ${functionId}`, `local.set $${destination}`);
    };
    const emitCallableCall = rawArgs => {
        const args = parseArgs(rawArgs);
        const count = Number(args[1]?.replace(/^i32\s+/, ""));
        if (!Number.isInteger(count) || count < 0 || count > 4 || args.length !== count + 2) {
            throw new Error("WebAssembly functions can be called with up to four arguments");
        }
        if (!indirectArities.has(count)) {
            throw new Error(`No Tekst function accepts ${count} arguments in this program`);
        }
        for (const argument of args.slice(2)) add(operand(argument)[0]);
        add(operand(args[0])[0], `call_indirect (type $call_${count})`);
    };

    let match = instruction.match(/^%([\w.$-]+) = getelementptr inbounds \[\d+ x i8\], ptr @([.$\w-]+), i64 0, i64 0$/);
    if (match) {
        const global = globals.find(item => item.name === match[2]);
        if (!global) throw new Error(`Unknown LLVM string global @${match[2]}`);
        add(`i32.const ${global.offset}`, `local.set $${match[1]}`);
        return;
    }

    match = instruction.match(/^%([\w.$-]+) = alloca ptr$/);
    if (match) {
        const index = allocaOffsets.get(match[1]);
        add("local.get $frame", `i32.const ${(index + 1) * 4}`, "i32.sub", `local.set $${match[1]}`);
        return;
    }

    match = instruction.match(/^store ptr (%[\w.$-]+), ptr (%[\w.$-]+)$/);
    if (match) {
        add(`local.get $${match[2].slice(1)}`, `local.get $${match[1].slice(1)}`, "i32.store");
        return;
    }

    match = instruction.match(/^%([\w.$-]+) = load ptr, ptr (%[\w.$-]+)$/);
    if (match) {
        add(`local.get $${match[2].slice(1)}`, "i32.load", `local.set $${match[1]}`);
        return;
    }

    match = instruction.match(/^%([\w.$-]+) = call (ptr|i1|i32)(?: \([^)]*\))?\s+@([\w.$-]+)\((.*)\)$/);
    if (match) {
        const [, destination, resultType, name, rawArgs] = match;
        if (name === "rt_list") {
            const allArgs = parseArgs(rawArgs);
            const count = Number(allArgs[0]?.replace(/^i32\s+/, ""));
            if (!Number.isInteger(count) || count < 0 || allArgs.length !== count + 1) {
                throw new Error("Invalid LLVM list literal");
            }
            const args = allArgs.slice(1);
            add("call $rt_list_empty", `local.set $${destination}`);
            for (const argument of args) {
                add(`local.get $${destination}`, operand(argument)[0], "call $rt_list_push");
            }
            return;
        }
        if (name === "rt_range") {
            const args = parseArgs(rawArgs);
            const count = Number(args[0]?.replace(/^i32\s+/, ""));
            if (count < 1 || count > 3 || args.length !== count + 1) {
                throw new Error(`WebAssembly backend does not support range with ${count} arguments`);
            }
            for (const argument of args.slice(1)) add(operand(argument)[0]);
            add(`call $rt_range_${["", "one", "two", "three"][count]}`, `local.set $${destination}`);
            return;
        }
        if (name === "rt_dict") {
            const allArgs = parseArgs(rawArgs);
            const count = Number(allArgs[0]?.replace(/^i32\s+/, ""));
            if (!Number.isInteger(count) || count < 0 || allArgs.length !== count * 2 + 1) {
                throw new Error("Invalid LLVM dictionary literal");
            }
            add("call $rt_dict_empty", `local.set $${destination}`);
            for (let index = 1; index < allArgs.length; index += 2) {
                add(
                    `local.get $${destination}`,
                    operand(allArgs[index])[0],
                    operand(allArgs[index + 1])[0],
                    "call $rt_dict_set_item"
                );
            }
            return;
        }
        if (name === "rt_callable") {
            emitCallable(rawArgs, destination);
            return;
        }
        if (name === "rt_call_callable") {
            emitCallableCall(rawArgs);
            add(`local.set $${destination}`);
            return;
        }
        if (name === "rt_call_method") {
            const args = parseArgs(rawArgs);
            const count = args.length - 3;
            if (count < 0 || count > 2 || args.at(-1)?.trim() !== "ptr null") {
                throw new Error("WebAssembly supports methods with up to two explicit arguments");
            }
            for (const argument of args.slice(0, -1)) add(operand(argument)[0]);
            add(`call $rt_call_method_${["zero", "one", "two"][count]}`, `local.set $${destination}`);
            return;
        }
        if (name === "rt_print_many") {
            const args = parseArgs(rawArgs);
            const values = args.slice(1);
            for (let index = 0; index < values.length; index++) {
                if (index) add("call $rt_print_space");
                add(operand(values[index])[0], "call $rt_print_part");
            }
            add("call $rt_print_newline");
            add("i32.const 0", `local.set $${destination}`);
            return;
        }
        if (!functionNames.has(name) && !runtimeSignature(name)) {
            throw new Error(`WebAssembly backend does not support function ${name}`);
        }
        for (const argument of parseArgs(rawArgs)) {
            const [code] = operand(argument);
            add(code);
        }
        add(`call $${name}`);
        if (resultType !== "void" && runtimeSignature(name)?.[1] !== null && (functionNames.has(name) || runtimeSignature(name)?.[1])) {
            add(`local.set $${destination}`);
        } else if (resultType === "i1") {
            add(`local.set $${destination}`);
        }
        return;
    }

    match = instruction.match(/^call void(?: \([^)]*\))?\s+@([\w.$-]+)\((.*)\)$/);
    if (match) {
        const [, name, rawArgs] = match;
        if (name === "rt_print_many") {
            const values = parseArgs(rawArgs).slice(1);
            for (let index = 0; index < values.length; index++) {
                if (index) add("call $rt_print_space");
                add(operand(values[index])[0], "call $rt_print_part");
            }
            add("call $rt_print_newline");
            return;
        }
        if (name === "rt_list_push") {
            for (const argument of parseArgs(rawArgs)) add(operand(argument)[0]);
            add(`call $${name}`);
            return;
        }
        const signature = runtimeSignature(name);
        if (!signature || signature[1] !== null) {
            throw new Error(`WebAssembly backend does not support void function ${name}`);
        }
        for (const argument of parseArgs(rawArgs)) add(operand(argument)[0]);
        add(`call $${name}`);
        return;
    }

    match = instruction.match(/^call ptr(?: \([^)]*\))?\s+@([\w.$-]+)\((.*)\)$/);
    if (match) {
        const [, name, rawArgs] = match;
        if (!functionNames.has(name) && !runtimeSignature(name)) {
            throw new Error(`WebAssembly backend does not support function ${name}`);
        }
        for (const argument of parseArgs(rawArgs)) add(operand(argument)[0]);
        add(`call $${name}`, "drop");
        return;
    }

    match = instruction.match(/^ret ptr (%[\w.$-]+)$/);
    if (match) {
        add("local.get $frame", "global.set $sp", `local.get $${match[1].slice(1)}`, "return");
        return;
    }
    match = instruction.match(/^ret i32 (.+)$/);
    if (match) {
        const [code] = operand(`i32 ${match[1]}`);
        add("local.get $frame", "global.set $sp", code, "return");
        return;
    }
    if (instruction === "ret void") {
        add("local.get $frame", "global.set $sp", "i32.const 0", "return");
        return;
    }

    match = instruction.match(/^br label %([\w.$-]+)$/);
    if (match) {
        branch(match[1]);
        return;
    }
    match = instruction.match(/^br i1 (%[\w.$-]+), label %([\w.$-]+), label %([\w.$-]+)$/);
    if (match) {
        add(
            `local.get $${match[1].slice(1)}`,
            "if",
            `  i32.const ${targetIndex(match[2])}`,
            "  local.set $pc",
            "else",
            `  i32.const ${targetIndex(match[3])}`,
            "  local.set $pc",
            "end",
            "br $dispatch"
        );
        return;
    }

    throw new Error(`Unsupported LLVM IR instruction: ${instruction}`);
}

export { translate };
