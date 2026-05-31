export const LEVELS = [
    {
        id: 'level_003_capacity_pressure',
        grid: {
            rows: 6,
            cols: 5
        },
        arrows: [
            {
                id: 'green_right_01',
                color: 'green',
                direction: 'right',
                head: { row: 0, col: 4 },
                cells: [
                    { row: 0, col: 2 },
                    { row: 0, col: 3 },
                    { row: 0, col: 4 }
                ]
            },
            {
                id: 'orange_left_01',
                color: 'orange',
                direction: 'left',
                head: { row: 5, col: 0 },
                cells: [
                    { row: 5, col: 2 },
                    { row: 5, col: 1 },
                    { row: 5, col: 0 }
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
                head: { row: 4, col: 1 },
                cells: [
                    { row: 1, col: 1 },
                    { row: 2, col: 1 },
                    { row: 3, col: 1 },
                    { row: 4, col: 1 }
                ]
            },
            {
                id: 'purple_up_01',
                color: 'purple',
                direction: 'up',
                head: { row: 2, col: 4 },
                cells: [
                    { row: 5, col: 4 },
                    { row: 4, col: 4 },
                    { row: 3, col: 4 },
                    { row: 2, col: 4 }
                ]
            },
            {
                id: 'green_right_02',
                color: 'green',
                direction: 'right',
                head: { row: 3, col: 3 },
                cells: [
                    { row: 3, col: 2 },
                    { row: 3, col: 3 }
                ]
            },
            {
                id: 'pink_left_01',
                color: 'pink',
                direction: 'left',
                head: { row: 2, col: 2 },
                cells: [
                    { row: 2, col: 3 },
                    { row: 2, col: 2 }
                ]
            },
            {
                id: 'yellow_up_01',
                color: 'yellow',
                direction: 'up',
                head: { row: 4, col: 3 },
                cells: [
                    { row: 5, col: 3 },
                    { row: 4, col: 3 }
                ]
            }
        ],
        shooters: [
            {
                id: 'green_right_01',
                color: 'green',
                shots: 5,
                side: 'top',
                laneIndex: 0,
                isBlocked: false,
                directCoord: { row: 0, col: 4 }
            },
            {
                id: 'orange_left_01',
                color: 'orange',
                shots: 3,
                side: 'left',
                laneIndex: 5,
                isBlocked: false,
                directCoord: { row: 2, col: 0 }
            },
            {
                id: 'pink_bottom_01',
                color: 'pink',
                shots: 5,
                side: 'bottom',
                laneIndex: 0,
                isBlocked: false,
                directCoord: { row: 7, col: 2 }
            },
            {
                id: 'yellow_bottom_01',
                color: 'yellow',
                shots: 6,
                side: 'bottom',
                laneIndex: 1,
                isBlocked: false,
                directCoord: { row: 7, col: 3 }
            },
            {
                id: 'purple_top_01',
                color: 'purple',
                shots: 4,
                side: 'right',
                laneIndex: 4,
                isBlocked: false,
                directCoord: { row: 3, col: 6 }
            },
            {
                id: 'pink_top_blocked_01',
                color: 'pink',
                shots: 2,
                side: 'top',
                laneIndex: 1,
                isBlocked: true,
                directCoord: { row: 0, col: 2 }
            },
            {
                id: 'purple_right_blocked_01',
                color: 'purple',
                shots: 2,
                side: 'right',
                laneIndex: 4,
                isBlocked: true,
                directCoord: { row: 5, col: 6 }
            }
        ]
    }
];
