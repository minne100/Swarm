# Graph Report - E:\MyProgram\swarm  (2026-04-26)

## Corpus Check
- Corpus is ~105 words - fits in a single context window. You may not need a graph.

## Summary
- 8 nodes · 11 edges · 2 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]

## God Nodes (most connected - your core abstractions)
1. `Swarm Paradigm README` - 7 edges
2. `Dance` - 3 edges
3. `Swarm` - 3 edges
4. `Bee` - 2 edges
5. `Honey` - 2 edges
6. `Hive` - 2 edges
7. `BeeHub` - 2 edges
8. `graphify` - 1 edges

## Surprising Connections (you probably didn't know these)
- `Swarm Paradigm README` --references--> `Hive`  [EXTRACTED]
  README.md → README.md  _Bridges community 0 → community 1_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.6
Nodes (5): Bee, Dance, Honey, Swarm Paradigm README, graphify

### Community 1 - "Community 1"
Cohesion: 0.67
Nodes (3): BeeHub, Hive, Swarm

## Knowledge Gaps
- **1 isolated node(s):** `graphify`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Swarm Paradigm README` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.762) - this node is a cross-community bridge._
- **Why does `Swarm` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `graphify` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._