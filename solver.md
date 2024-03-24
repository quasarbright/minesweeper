# solver

notes for figuring out how to write the solver


## sat solver

I think you can model it as something like an incremental SAT solver.

each revealed, non-zero cell corresponds to a term. each hidden cell on the "frontier" corresponds to a variable.
the frontier cells are hidden, uncertain cells adjacent to revealed ones.

for example, if you have a revealed 1 cell adjacent to exactly 3 hidden cells A,B,C, you have 

```
exactly one of (A !B !C), (!A B !C), (!A B !C)
```

if you also have a revealed 1 cell adjacent to exactly B and C, you have

```
exactly one of (B !C), (!B C)
```

If A was true, the first 3 possibilities would become

```
exactly one of (!B !C) F F <=> (!B !C)
```

This contradicts the second set of possibilities, therefore A must not be true, therefore it must be false.

instead of trying to find one possible assignment of variables that satisfies the constraints, we are trying to eliminate
assignments that lead to contradictions. What is left are the possibilities.

How do we automate this?

For each variable, try setting it to true. then try to satisfy. if it leads to a contradiction, the variable is false. otherwise,
try setting it to false. if it leads to a contradiction, the variable is true. otherwise, try the next variable and repeat.

if the game is guess-free, one of the variables will be set each time this process runs, so we'll always win.

this would work, but it sounds very inefficient.

would definitely need to be augmented by simple automation like reveal all unflagged neighbors of satisfied revealed cells,
flag all neighbors if remaining unflagged neighbors is equal to remaining mined neighbors

## sets of cells with mine counts

if you have a 1 adjacent to A,B,C, you'd have

```
1ABC
```

if you have a 1 adjacent to B,C, you'd have

```
1BC
```

rule: if one 1-count is a subset of another, the elements of the different are all safe

```
1ABC, 1BC => 0A, 1BC
```

this allows us to conclude A is safe

Another scenario:
```
1AB
2ABC
```

rule: if a 1-count is a subset of a 2-count, there is a mine in the difference.

more general rule: if an x-count is a subset of a y-count, you can deduce a (y-x)-count in the difference
that subsumes the first rule too. can you get rid of the superset after? Yes
call it the subset rule.
```
NS,MT (S subset of T) => NS,(M-N)(T-S)
```

This is nice, but how do you know when to apply a rule? When it results in a certainty?
You could try the cross product of all overlapping counts and go deeper if you need to with a maximum depth.
But there are some times when you'll need to go deep.

Actually, these rules may not explode as badly as I thought. A count set is a certainty if the count is zero or equal to the set size.
As long as these rules produce count sets closer to these conditions, it should end up terminating.

For now, it's probably safe to assume that you only need to use 2 pieces of information at once.

rule: 2 non-overlapping count sets can be combined. An x-count and a y-count can combine to an (x+y)-count with the union of sets.
apply sparingly because it doesn't produce anything closer to certainty. probably not even necessary.
call it the union rule.

rule: the special 1-2 rule
```
1{A,B,C,...},2{A,B,D} => 1D => 0{C,...},1{A,B},1D
```
more general rule: the general 1-2 rule, or just the 1-2 rule. Applicable when an N-count overlaps 2 cells with a 1-count.
```
1{A,B,C,...},N{A,B,D,... size N+1} => (N-1){D,...} => 0{C,...},1{A,B},(N-1){D,...}
```
produces 2 certainties and a 50-50

a count set either comes from a non-zero revealed cell, or two count sets and a rule. keep track of parent cells for update purposes, like
when a cell gets revealed or flagged, or when a mine is moved in guess-free generation.
if you only use the subset rule, you can probably get rid of the superset and then parent tracking is super simple. there is a one to one
correspondence between non-zero revealed cell and count set.

two count sets can be combined via rules.

a count set can also be updated once new information is deduced.
```
NABC... + 1A => (N-1)BC...
NABC... + 0A => (N)BC...
```

certainties can be broken up into singletons:
```
0ABC... => 0A,0B,0C,... (deduced safe cells)
NABC... (set of size N) => 1A,1B,1C,... (deduced mine cells)
```

algorithm:
INVARIANT: Count sets should only contain frontier cells.
start by clicking the hinted cell, or random.
create count sets from each non-zero revealed cell.
handleCertainties:
  compute certainties the obvious way, and with the 1-2 rule.
  refine/prune all count sets according to certainties
  flag/reveal cells according to certainties
  add count sets for newly revealed cells
  repeat until idempotent
deduce:
  apply subset rule between all count sets. but when you apply it, get rid of the superset, just keep the subset and the difference
  handleCertainties
  repeat until idempotent
solve:
  deduce
solve()



performance:
deduction should be the bottleneck.
it looks like we might do O(n^2) operations over and over again where n is the number of useful count sets, but really,
most of those get skipped. It's actually at most O(8n)=O(n) because subset can only occur between adjacent cells and the total count set.
And I feel like the number of deduction iterations should also be bounded by like 8, but that might not be true.
There is definitely some optimization to be done in the application in the subset rule.
There still is an O(n^2) though technically.

Advantage: won't take that long to run I think. definitely better than a sat.
Advantage: no superposition, makes it more efficient I think.
Advantage: can save count sets between iterations so you don't forget information you've computed. but they'll need to be updated as you go.
Advantage: can represent 50-50s very directly.
Advantage: you can prune count sets as you learn more information.
Advantage: can easily integrate total mines remaining. just add a count set of all hidden cells.
Advantage: much more direct mapping of the information the game provides you
Advantage: more understandable and human-like
Disadvantage: I feel like this'll miss stuff. Like 1ABC+1BCD => either 1B or 1C or 2AD. It can't express superpositions that may be necessary.
