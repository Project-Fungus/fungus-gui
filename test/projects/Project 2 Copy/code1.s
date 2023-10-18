// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text

/* Place the value of n in R0
 * The subroutine will place the nth fibonacci number in R0
 */
fibo:    CMP  R0, #1
         BGT  rec
         BX   R14          // Base case: leave n in R0 and return
rec:     PUSH {R5-R6,R14}  // Recursive case
         MOV  R5, R0      // Save n in R5
         SUB  R0, R5, #1
         BL   fibo
         MOV  R6, R0      // Calculate fibo(n-1) and save the result in R6
         SUB  R0, R5, #2
         BL   fibo        // Calculate fibo(n-2) and leave the result in R0
         ADD  R0, R0, R6  // Move fibo(n-1) + fibo(n-2) into R0
         POP  {R5-R6,R14}
         BX   R14

.data
N:   .word 0
FIB: .space 4

// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text
// Random text

// This text is to test the frontend's behaviour when highlighted regions
// overlap. Click each part to see what happens.
|aaaaaaaaaa|aaaaaaaaaa|aaaaaaaaaa|
