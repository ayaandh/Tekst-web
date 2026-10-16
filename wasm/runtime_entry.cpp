#include "../src/runtime.h"

extern "C" Value* rt_std_call_browser(
    const char* module,
    const char* name,
    int argc,
    Value* a0,
    Value* a1,
    Value* a2,
    Value* a3,
    Value* a4,
    Value* a5,
    Value* a6,
    Value* a7
) {
    return rt_std_call(module, name, argc, a0, a1, a2, a3, a4, a5, a6, a7);
}
