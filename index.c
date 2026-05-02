#include <stdio.h>
#include <string.h>

#define MAX 1000

void explainCode(char code[]) {
    printf("\n=== AI EXPLANATION ===\n");

    if (strstr(code, "for") != NULL) {
        printf("- knxoufo kyna For fhad lcode.\n");
        printf("- ktstakhdm bla condition d'arret w lhadaf dilha t3awd i w t2nkrimentiha hta twsl l n w tw9f.\n");
    }

   
    if (strstr(code, "while") != NULL) {
        printf("- knxoufo kyna While fhad lcode.\n");
        printf("- ltstakhdm bcodition d'arret li hiya entre () w kt3ni 3wd hta l had lcodition.\n");
    }

     

     if (strstr(code, "do") != NULL) {
        printf("- knxoufo kyna DO fhad lcode.\n");
        printf("- ltstakhdm bcodition d'arret li hiya entre () w kt3ni 3wd hta l had lcodition.\n");
    }

   

    if (strstr(code, "if") != NULL) {
        printf("- knxoufo kyna If fhad lcode.\n");
        printf("- ltstakhdm bcodition d'arret li hiya entre () w kt3ni ila t79a9at dkhol mt79atx khrj.\n");
    }

     

    if (strstr(code, "printf") != NULL) {
        printf("- printf kt3br 3la laffichage dikxi li wstha howa li kyt2ficha.\n");
    }

   

    if (strstr(code, "scanf") != NULL) {
        printf("- scanf kt9ra dikxi li affichit.\n");
    }
        
    

   

    if (strstr(code, "void") != NULL)  
    {
        printf("- knxoufo kyna VOID fhad lcode.\n");
        printf("- hiya wa7d lfonction li ma kat3awdch chi 7aja w kat9dr t3awd t3awd t3awd.\n");
    }
    
    

    if (strstr(code, "int main") != NULL) {
        printf("- knxoufo kyna Int Main fhad lcode.\n");
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