### 1.0.0

-   initial version.

### 1.0.1

-   Solved a bug in PouchDB/CouchDB: when deleting a documents pouchDB will call changes callback saying that a document has been added, and gives an old revision of the deleted document.

### 1.0.2

-   Better build.

### 1.0.3

-   Target es6 only.

### 1.0.4

-   Giving full model as a parameter of `deleteAccessories`

### 1.0.5

-   removed `deleteAccessories` prop
-   config.throw to configure when should the library throw
-   hooks: `afterChange`, `afterDelete` & `afterAdd`

### 1.0.6

-   Grabbing documents from pouchDB must be in a descending order

### 1.0.7

-   Added ability to manually call Model.saveToPouch

### 1.0.8

-   Improved performance on first connect and documents grab

### 1.0.9

-   Improved performance by dealing with bulks of documents
