#include <string.h>
#include <ctype.h>

int __has_only_whitespaces(char* s) {
    unsigned int i;
    for (i = 0; i < strlen(s); i++) {
        if (isspace(s[i]) == 0){
            return 0;
        }
    }
    return 1;
}
