_start:  LDR  A1, =N
         LDR  A1, [A1]    // Load n into A1
         PUSH {LR}
         BL   fibo        // R0 = fibo(n)
         POP  {LR}
         LDR  V1, =FIB
         STR  R0, [V1]    // Store result in memory
_end:    B    _end