#include "../src/ast.h"
#include "../src/codegen.h"
#include "../src/lexer.h"
#include "../src/parser.h"

#include <iostream>
#include <iterator>
#include <stdexcept>
#include <string>

namespace {
bool isBrowserStandardModule(const std::string& module) {
    return module == "math" || module == "random" || module == "fs" ||
        module == "time" || module == "os" || module == "json";
}

bool isNetworkModule(const std::string& module) {
    return module == "http" || module == "socket" || module == "smtp" ||
        module == "stmp";
}
}

int main() {
    try {
        std::ios::sync_with_stdio(false);
        const std::string source{
            std::istreambuf_iterator<char>(std::cin),
            std::istreambuf_iterator<char>()};
        const auto tokens = lex(source, "main.tk");
        const auto program = parse(tokens, source, "main.tk");

        for (const auto& statement : program.body) {
            const Import* import = dynamic_cast<Import*>(statement.get());
            const FromImport* fromImport = dynamic_cast<FromImport*>(statement.get());
            const std::string module = import ? import->module :
                fromImport ? fromImport->module : "";
            if (module.empty()) continue;
            if (isNetworkModule(module)) {
                throw std::runtime_error(
                    "HTTP, socket, and SMTP modules are not available in the browser playground");
            }
            if (!isBrowserStandardModule(module)) {
                throw std::runtime_error(
                    "Local Tekst imports are not available in the browser playground");
            }
        }

        std::cout << Codegen().generate(program);
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    } catch (...) {
        std::cerr << "Tekst compiler failed with an unknown error\n";
        return 1;
    }
}
