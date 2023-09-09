/* Place the value of n in R0
 * The subroutine will place the nth fibonacci number in R0
 */
fibo:    CMP  A1, #1
         BGT  rec
         BX   LR          // Base case: leave n in R0 and return
rec:     PUSH {V1-V2,LR}  // Recursive case
         MOV  V1, A1      // Save n in V1
         SUB  A1, V1, #1
         BL   fibo
         MOV  V2, A1      // Calculate fibo(n-1) and save the result in V2
         SUB  A1, V1, #2
         BL   fibo        // Calculate fibo(n-2) and leave the result in A1
         ADD  A1, A1, V2  // Move fibo(n-1) + fibo(n-2) into A1
         POP  {V1-V2,LR}
         BX   LR
