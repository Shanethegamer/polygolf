# Table Hashing

```polygolf
print (table_get
    (table
        ("▄ ▄▄▄" => "A")
        ("▄▄▄ ▄ ▄ ▄" => "B")
        ("▄▄▄ ▄ ▄▄▄ ▄" => "C")
    )
    (argv_get 0)
);
```

```polygolf hashing.testTableHashing(999)
print (list_get (list "B" "C" "A") (((@FunctionCall ? (@BuiltinIdent "hash") (argv_get 0)) mod 11) mod 3));
```

```polygolf hashing.testTableHashing(9)
print (list_get (list "A" "B" "" "C") (((@FunctionCall ? (@BuiltinIdent "hash") (argv_get 0)) mod 9) mod 4));
```