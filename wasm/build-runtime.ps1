$ErrorActionPreference = "Stop"

$SdkCandidates = @()
if ($env:WASI_SDK_PATH) {
    $SdkCandidates += $env:WASI_SDK_PATH
}
$SdkCandidates += @(
    "C:\wasi-sdk",
    "C:\Program Files\WASI SDK",
    (Join-Path $HOME "wasi-sdk")
)

$SdkRoot = $null
foreach ($Candidate in $SdkCandidates) {
    if ((Test-Path -LiteralPath (Join-Path $Candidate "bin\clang++.exe")) -and
        (Test-Path -LiteralPath (Join-Path $Candidate "share\wasi-sysroot"))) {
        $SdkRoot = (Resolve-Path -LiteralPath $Candidate).Path
        break
    }
}

if (-not $SdkRoot) {
    throw "WASI SDK not found. Install it or set WASI_SDK_PATH to its root folder (expected bin\clang++.exe and share\wasi-sysroot)."
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot

try {
    $Cxx = Join-Path $SdkRoot "bin\clang++.exe"
    $Sysroot = Join-Path $SdkRoot "share\wasi-sysroot"
    $Target = "wasm32-wasip1"

    $CompilerArgs = @(
        "--target=$Target"
        "--sysroot=$Sysroot"
        "-std=c++17"
        "-O2"
        "-fwasm-exceptions"
        "-mllvm"
        "-wasm-use-legacy-eh=false"
        "-Wl,-z,stack-size=2097152"
        "-Isrc"
        "src/lexer.cpp"
        "src/parser.cpp"
        "src/codegen.cpp"
        "src/ast.cpp"
        "wasm/compiler_entry.cpp"
        "-o"
        "playground/tekst-compiler.wasm"
        "-lunwind"
    )

    & $Cxx @CompilerArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build the Tekst browser compiler"
    }

    $RuntimeArgs = @(
        "--target=$Target"
        "--sysroot=$Sysroot"
        "-std=c++17"
        "-O2"
        "-fwasm-exceptions"
        "-mllvm"
        "-wasm-use-legacy-eh=false"
        "-mllvm"
        "-wasm-enable-sjlj"
        "-Wl,-z,stack-size=2097152"
        "-Isrc"
        "src/runtime.cpp"
        "wasm/runtime_entry.cpp"
        "-o"
        "playground/tekst-runtime.wasm"
        "-Wl,--no-entry"
        "-Wl,--export-memory"
        "-Wl,--export=__wasm_call_ctors"
        "-Wl,--export=rt_none"
        "-Wl,--export=rt_int"
        "-Wl,--export=rt_float"
        "-Wl,--export=rt_str"
        "-Wl,--export=rt_str_const_empty"
        "-Wl,--export=rt_bool"
        "-Wl,--export=rt_add"
        "-Wl,--export=rt_sub"
        "-Wl,--export=rt_mul"
        "-Wl,--export=rt_div"
        "-Wl,--export=rt_mod"
        "-Wl,--export=rt_eq"
        "-Wl,--export=rt_ne"
        "-Wl,--export=rt_lt"
        "-Wl,--export=rt_le"
        "-Wl,--export=rt_gt"
        "-Wl,--export=rt_ge"
        "-Wl,--export=rt_neg"
        "-Wl,--export=rt_not"
        "-Wl,--export=rt_truth"
        "-Wl,--export=rt_print"
        "-Wl,--export=rt_print_part"
        "-Wl,--export=rt_print_space"
        "-Wl,--export=rt_print_newline"
        "-Wl,--export=rt_input"
        "-Wl,--export=rt_to_int"
        "-Wl,--export=rt_to_str"
        "-Wl,--export=rt_to_bool"
        "-Wl,--export=rt_to_float"
        "-Wl,--export=rt_len"
        "-Wl,--export=rt_index"
        "-Wl,--export=rt_set_index"
        "-Wl,--export=rt_list_empty"
        "-Wl,--export=rt_list_push"
        "-Wl,--export=rt_ref"
        "-Wl,--export=rt_deref"
        "-Wl,--export=rt_store"
        "-Wl,--export=rt_alloc"
        "-Wl,--export=rt_free"
        "-Wl,--export=rt_ptr_add"
        "-Wl,--export=rt_ptr_load_int"
        "-Wl,--export=rt_ptr_store_int"
        "-Wl,--export=rt_ptr_load_byte"
        "-Wl,--export=rt_ptr_store_byte"
        "-Wl,--export=rt_and"
        "-Wl,--export=rt_or"
        "-Wl,--export=rt_callable"
        "-Wl,--export=rt_call_callable"
        "-Wl,--export=rt_new_object"
        "-Wl,--export=rt_get_attr"
        "-Wl,--export=rt_set_attr"
        "-Wl,--export=rt_optional_attr"
        "-Wl,--export=rt_call_method"
        "-Wl,--export=rt_call_method_zero"
        "-Wl,--export=rt_call_method_one"
        "-Wl,--export=rt_call_method_two"
        "-Wl,--export=rt_format"
        "-Wl,--export=rt_list"
        "-Wl,--export=rt_dict"
        "-Wl,--export=rt_dict_empty"
        "-Wl,--export=rt_dict_set_item"
        "-Wl,--export=rt_range_one"
        "-Wl,--export=rt_range_two"
        "-Wl,--export=rt_range_three"
        "-Wl,--export=rt_try_begin"
        "-Wl,--export=rt_try_end"
        "-Wl,--export=rt_throw"
        "-Wl,--export=rt_last_error"
        "-lunwind"
        "-lsetjmp"
    )

    & $Cxx @RuntimeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build the Tekst browser runtime"
    }
}
finally {
    Pop-Location
}
