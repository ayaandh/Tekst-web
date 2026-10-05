#include "../src/ast.h"
#include "../src/codegen.h"
#include "../src/lexer.h"
#include "../src/parser.h"

#include <iostream>
#include <iterator>
#include <stdexcept>
#include <string>

int main() {
    try {
        std::ios::sync_with_stdio(false);
        const std::string source{
            std::istreambuf_iterator<char>(std::cin),
            std::istreambuf_iterator<char>()};
        const auto tokens = lex(source, "main.tk");
        const auto program = parse(tokens, source, "main.tk");

        for (const auto& statement : program.body) {
            if (dynamic_cast<Import*>(statement.get()) ||
                dynamic_cast<FromImport*>(statement.get())) {
                throw std::runtime_error(
                    "Imports are not available in the browser playground");
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
