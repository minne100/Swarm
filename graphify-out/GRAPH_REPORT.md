# Graph Report - E:\MyProgram\swarm  (2026-04-26)

## Corpus Check
- Corpus is ~1,721 words - fits in a single context window. You may not need a graph.

## Summary
- 14 nodes · 26 edges · 5 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `Bee` - 7 edges
2. `Swarm` - 6 edges
3. `Dance` - 6 edges
4. `Honey` - 5 edges
5. `Skill-First` - 5 edges
6. `Acceptance Criteria` - 5 edges
7. `Beekeeping` - 4 edges
8. `MVP` - 4 edges
9. `Hive` - 3 edges
10. `Memory Palace` - 2 edges

## Surprising Connections (you probably didn't know these)
- `MVP` --defined_as_swarm_builds_swarm_itself--> `Swarm`  [EXTRACTED]
  Docs/MVP_SCOPE.md → README.md
- `Acceptance Criteria` --requires_ai_generated_artifact--> `Bee`  [EXTRACTED]
  Docs/ACCEPTANCE_CRITERIA.md → README.md
- `Acceptance Criteria` --requires_ai_generated_artifact--> `Honey`  [EXTRACTED]
  Docs/ACCEPTANCE_CRITERIA.md → README.md
- `Acceptance Criteria` --requires_ai_generated_artifact--> `Dance`  [EXTRACTED]
  Docs/ACCEPTANCE_CRITERIA.md → README.md
- `Risk Register` --identifies_non_compliance_as_high_risk--> `Skill-First`  [EXTRACTED]
  Docs/RISK_REGISTER.md → README.md

## Hyperedges (group relationships)
- **pipeline_swarm_standard** — goal_decomposition, skill_first, bee, honey, dance, hive, beekeeping [EXTRACTED 1.00]
- **pipeline_mvp_closed_loop** — goal_decomposition, skill_first, bee, honey, dance, hive, beekeeping, mvp [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 1.0
Nodes (4): Bee, Dance, Hive, Swarm

### Community 1 - "Community 1"
Cohesion: 0.67
Nodes (4): Acceptance Criteria, MVP, Risk Register, Skill-First

### Community 2 - "Community 2"
Cohesion: 0.67
Nodes (3): Beekeeping, Honey, Roadmap

### Community 3 - "Community 3"
Cohesion: 1.0
Nodes (2): Knowledge Graph, Memory Palace

### Community 4 - "Community 4"
Cohesion: 1.0
Nodes (1): Goal Decomposition

## Knowledge Gaps
- **2 isolated node(s):** `Goal Decomposition`, `Knowledge Graph`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 3`** (2 nodes): `Knowledge Graph`, `Memory Palace`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 4`** (1 nodes): `Goal Decomposition`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Swarm` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.306) - this node is a cross-community bridge._
- **Why does `Memory Palace` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `MVP` connect `Community 1` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `Goal Decomposition`, `Knowledge Graph` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._