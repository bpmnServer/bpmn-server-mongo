/**
 *
 *
 input Query:

 ```json
 {		"items.status":"wait",
        "name": "Buy Used Car with Lanes",
        "$or":[
            {"items.candidateGroups":"Owner"},
            {"items.candidateUsers":"User1"}
            ]
}
```
    /*

MongoQuery:

 ```json
{	"name":"Buy Used Car with Lanes",
    "$or":[
            {"items":{"$elemMatch":{"candidateGroups":"Owner"}}},
            {"items":{"$elemMatch":{"candidateUsers":"User1"}}}
        ],
    "items":{"$elemMatch":{"status":"wait"}
}
```

    And filter items by performing the Query on each Instance Item

 *
 * Supported Operators:
 * - $or
 * - $lte
 * - $lt
 * - $gte
 * - $gt
 * - $eq
 *	Missing the following:
 * - $ne
 * - $regex
 * - $in
 * - $and
 *
 *	https://www.mongodb.com/docs/manual/reference/operator/query/
 *
 * */
declare class QueryTranslator {
    childName: any;
    constructor(childName: any);
    translateCriteria(query: any): {};
    private filterOr;
    filterItem(item: any, query: any): boolean;
    private evaluateCondition;
    private evaluateValue;
    private parseComplexCondition;
}
export { QueryTranslator };
