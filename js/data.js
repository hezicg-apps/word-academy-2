// קובץ הנתונים המרכזי של Word Academy
// המבנה: ספר -> יחידה -> חלקים (שם ומילים בפורמט English - Hebrew)

const courseData = {
    "Magical": [
        {
            unit: "Unit 1",
            parts: [
                { name: "Part 1", words: "Apple - תפוח\nBanana - בננה\nOrange - תפוז" },
                { name: "Part 2", words: "Dog - כלב\nCat - חתול\nBird - ציפור" }
            ]
        },
        {
            unit: "Unit 2",
            parts: [
                { name: "Part 1", words: "Red - אדום\nBlue - כחול\nGreen - ירוק" },
                { name: "Part 2", words: "One - אחת\nTwo - שתיים\nThree - שלוש" }
            ]
        }
        // ... תוכל להוסיף כאן עוד יחידות ל-Magical
    ],
    "Legendary": [
        {
            unit: "Unit 1",
            parts: [
                { name: "Part 1", words: "Hello - שלום\nGoodbye - להתראות" }
            ]
        }
        // ... תוכל להוסיף כאן עוד יחידות ל-Legendary
    ],
    "Epic": [
        {
            unit: "Unit 1",
            parts: [
                { name: "Part 1", words: "House - בית\nSchool - בית ספר" }
            ]
        }
        // ... תוכל להוסיף כאן עוד יחידות ל-Epic
    ]
};
