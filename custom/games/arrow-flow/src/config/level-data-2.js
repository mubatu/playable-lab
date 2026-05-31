export const LEVELS = [
    {
        id: 'level_002_shooter_blocking',
        grid: {
            rows: 5,
            cols: 4
        },
        arrows: [
            {
                id: 'green_right_01',
                color: 'green',
                direction: 'right',
                head: { row: 0, col: 3 },
                cells: [
                    { row: 0, col: 1 },
                    { row: 0, col: 2 },
                    { row: 0, col: 3 }
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
            },
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
                head: { row: 3, col: 1 },
                cells: [
                    { row: 1, col: 1 },
                    { row: 2, col: 1 },
                    { row: 3, col: 1 }
                ]
            },
            {
                id: 'purple_up_01',
                color: 'purple',
                direction: 'up',
                head: { row: 2, col: 3 },
                cells: [
                    { row: 4, col: 3 },
                    { row: 3, col: 3 },
                    { row: 2, col: 3 }
                ]
            }
        ],
        shooters: [
            {
                id: 'green_right_01',
                color: 'green',
                shots: 4,
                side: 'right',
                laneIndex: 0,
                isBlocked: false,
                directCoord: { row: 1, col: 5 }
            },
            {
                id: 'orange_left_01',
                color: 'orange',
                shots: 4,
                side: 'left',
                laneIndex: 4,
                isBlocked: false,
                directCoord: { row: 5, col: 0 }
            },
            {
                id: 'pink_bottom_01',
                color: 'pink',
                shots: 4,
                side: 'bottom',
                laneIndex: 0,
                isBlocked: false,
                directCoord: { row: 6, col: 1 }
            },
            {
                id: 'yellow_bottom_01',
                color: 'yellow',
                shots: 4,
                side: 'bottom',
                laneIndex: 1,
                isBlocked: false,
                directCoord: { row: 6, col: 2 }
            },
            {
                id: 'purple_top_01',
                color: 'purple',
                shots: 4,
                side: 'top',
                laneIndex: 3,
                isBlocked: false,
                directCoord: { row: 0, col: 4 }
            },
            {
                id: 'pink_top_blocked_01',
                color: 'pink',
                shots: 2,
                side: 'top',
                laneIndex: 0,
                isBlocked: true,
                directCoord: { row: 0, col: 1 }
            },
            {
                id: 'green_right_blocked_01',
                color: 'green',
                shots: 2,
                side: 'right',
                laneIndex: 2,
                isBlocked: true,
                directCoord: { row: 3, col: 5 }
            }
        ]
    }
];
