---
'speccy-renderer': patch
---

Give each schema explorer constraint row a unique key, so a field with unequal `minLength` and `maxLength` no longer renders two siblings keyed `Length`.
