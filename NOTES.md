# Notes

Use this file however you like while you work. Things we will find useful:

- Assumptions you made, and questions you would have asked the product owner or a teammate.
- What you handed to an AI tool, what it gave back, and what you changed or rejected.
- Anything you noticed in the code that is not one of the three tasks.

---

## Local Project Setup

After first reading throught the README file, I cloned the repo to my local computer and to setup in Cursor as my choice of IDE with agentic development tools. 

Using Sourcetree, a git GUI, I created a branch to keep my work on so commits aren't directly on master.

### Cursor Documentation

In Cursor I prompted an agent:

```
I need you to go through the project and get a good understanding of how it works or should work, from there I need to you to create a record of documents in markdown format that clearly goes through each feature of the application. These documents are for your future context and future developers to use in development.
```

The purpose of this is to give the agent a baseline understanding of the application and to provide me with a full set of feature documents that I can review to more quickly come up to speed with the code base.

I then proceeded to review the documents that the agent created for me specifically `01-domain-and-principles.md` and `02-architecture.md`.

After reviewing the agent created documents, I then ran `npm install` and then `npm test` to verify that I was seeing the same failed tests described in the application README. I saw 5 failed tests.

I then commited the changes (via Cursor Agent) I have made to this point, which are just the documentation changes.

### Task 1

After reviewing the test, demo and the `session.ts` file in which the `manualAdvance()` function is located. I prompted the agent with the function code and 
```
double tapped buttons are creating an issue with skipping ingredients 
```
The agent then proposed a fix, which I reviewd and agreed with. Agents thoughts were:
```
The second Next tap was still advancing because manualAdvance only ignored future confirmations (confirmedIndex > index). A laggy double-tap confirms the previous ingredient, so the session skipped hay.

It now requires an exact match: ignore the tap unless confirmedIndex is still the current ingredient.
```


