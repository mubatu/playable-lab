export const LEVELS = [
    {
        id: 'level_001_intro',
        grid: {
            rows: 5,
            cols: 4
        },
        arrows: [
            {
                id: 'pink_down_01',
                color: 'pink',
                direction: 'down',
                head: { row: 2, col: 0 },
                cells: [
                    { row: 0, col: 0 },
                    { row: 1, col: 0 },
                    { row: 2, col: 0 }
                ]
            },
            {
                id: 'yellow_down_01',
                color: 'yellow',
                direction: 'down',
                head: { row: 2, col: 1 },
                cells: [
                    { row: 0, col: 1 },
                    { row: 1, col: 1 },
                    { row: 2, col: 1 }
                ]
            },
            {
                id: 'green_right_01',
                color: 'green',
                direction: 'right',
                head: { row: 3, col: 3 },
                cells: [
                    { row: 3, col: 1 },
                    { row: 3, col: 2 },
                    { row: 3, col: 3 }
                ]
            },
            {
                id: 'orange_left_01',
                color: 'orange',
                direction: 'left',
                head: { row: 4, col: 0 },
                cells: [
                    { row: 4, col: 2 },
                    { row: 4, col: 1 },
                    { row: 4, col: 0 }
                ]
            }
        ],
        shooters: [
            {
                id: 'pink_bottom_01',
                color: 'pink',
                shots: 4,
                side: 'bottom',
                laneIndex: 0,
                isBlocked: false,
                directCoord: { row: 6, col: 4 }
            },
            {
                id: 'yellow_bottom_01',
                color: 'yellow',
                shots: 4,
                side: 'bottom',
                laneIndex: 1,
                isBlocked: false,
                directCoord: { row: 6, col: 1 }
            },
            {
                id: 'green_right_01',
                color: 'green',
                shots: 4,
                side: 'right',
                laneIndex: 3,
                isBlocked: false,
                directCoord: { row: 2, col: 5 }
            },
            {
                id: 'orange_left_01',
                color: 'orange',
                shots: 4,
                side: 'left',
                laneIndex: 4,
                isBlocked: false,
                directCoord: { row: 3, col: 0 }
            }
        ]
    }
];
