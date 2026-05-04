#include <stdio.h>
#include <string.h>

#define MAX 1000

void explainCode(char code[]) {
    printf("\n=== AI EXPLANATION ===\n");

    if (strstr(code, "#include") != NULL) {
        printf("- Detected '#include'. It is a preprocessor directive used to include standard or user-defined headers.\n");
    }

    if (strstr(code, "int main") != NULL) {
        printf("- Detected 'int main'. This is the main entry point where the program execution begins.\n");
    }

    if (strstr(code, "for") != NULL) {
        printf("- Detected a 'for' loop. It is used to iterate over a block of code with an initialization, condition, and increment.\n");
    }

    if (strstr(code, "while") != NULL) {
        printf("- Detected a 'while' loop. It executes a block of code repeatedly as long as a given condition is true.\n");
    }

    if (strstr(code, "do") != NULL) {
        printf("- Detected a 'do-while' loop. It executes a block of code at least once before checking the condition.\n");
    }

    if (strstr(code, "if") != NULL) {
        printf("- Detected an 'if' statement. It is used for conditional branching (executes if the condition is true).\n");
    }

    if (strstr(code, "switch") != NULL) {
        printf("- Detected a 'switch' statement. It evaluates an expression and executes the corresponding 'case' block.\n");
    }

    if (strstr(code, "printf") != NULL) {
        printf("- Detected 'printf'. It outputs formatted text to the standard output (screen).\n");
    }

    if (strstr(code, "scanf") != NULL) {
        printf("- Detected 'scanf'. It reads formatted input from the standard input (keyboard).\n");
    }

    if (strstr(code, "void") != NULL) {
        printf("- Detected 'void'. It indicates that a function does not return a value.\n");
    }

    if (strstr(code, "return") != NULL) {
        printf("- Detected 'return'. It ends the execution of a function and optionally returns a value.\n");
    }

    if (strstr(code, "struct") != NULL) {
        printf("- Detected 'struct'. It is a user-defined data type that groups related variables of different types.\n");
    }

    if (strstr(code, "malloc") != NULL) {
        printf("- Detected 'malloc'. It is used for dynamic memory allocation during program execution.\n");
    }

    if (strstr(code, "free") != NULL) {
        printf("- Detected 'free'. It is used to deallocate memory previously allocated by malloc.\n");
    }

    printf("\n=== END OF ANALYSIS ===\n");
}

int main() {
    char code[MAX];

    printf("Enter your C code (end with ENTER):\n");
    fgets(code, MAX, stdin);

    explainCode(code);

    return 0;
}