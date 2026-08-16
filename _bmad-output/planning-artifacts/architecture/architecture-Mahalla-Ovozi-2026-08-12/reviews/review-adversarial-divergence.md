# Adversarial Divergence Review — React Router Correction

Verdict: Pass.

Attempted divergence: one frontend unit installs `react-router`, while another follows older React Router examples and installs `react-router-dom`.

Result: AD-2 now closes this hole explicitly by requiring the v8 `react-router` package and prohibiting the removed `react-router-dom` package. The Stack table repeats the package identity, so lower-level implementation units cannot obey the architecture while selecting conflicting router packages.

No shared-data ownership, state-mutation, API-contract, or product-scope divergence is affected by this package-only clarification.

Findings: none.
