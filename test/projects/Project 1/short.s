write_byte:
        push    {r3, r4, lr}
        ldr     r4, =0xfff0
        and     r3, r3, #0xff
        str     r3, [r4]
        pop     {r3, r4, pc}
