export const LEVELS = [
  {
    id: 'level_arrow_flow_screenshot_01',
    grid: {
      rows: 14,
      cols: 10
    },
    arrows: [
      {
        id: 'yellow_up_01',
        color: 'yellow',
        direction: 'up',
        head: { row: 0, col: 4 },
        cells: [
          { row: 2, col: 3 },
          { row: 1, col: 3 },
          { row: 1, col: 4 },
          { row: 0, col: 4 }
        ]
      },
      {
        id: 'purple_up_01',
        color: 'purple',
        direction: 'up',
        head: { row: 0, col: 5 },
        cells: [
          { row: 2, col: 6 },
          { row: 1, col: 6 },
          { row: 1, col: 5 },
          { row: 0, col: 5 }
        ]
      },
      {
        id: 'purple_up_02',
        color: 'purple',
        direction: 'up',
        head: { row: 2, col: 2 },
        cells: [
          { row: 4, col: 0 },
          { row: 4, col: 1 },
          { row: 3, col: 1 },
          { row: 3, col: 2 },
          { row: 2, col: 2 }
        ]
      },
      {
        id: 'green_right_01',
        color: 'green',
        direction: 'right',
        head: { row: 2, col: 5 },
        cells: [
          { row: 4, col: 3 },
          { row: 3, col: 3 },
          { row: 3, col: 4 },
          { row: 2, col: 4 },
          { row: 2, col: 5 }
        ]
      },
      {
        id: 'yellow_up_02',
        color: 'yellow',
        direction: 'up',
        head: { row: 2, col: 7 },
        cells: [
          { row: 4, col: 9 },
          { row: 4, col: 8 },
          { row: 3, col: 8 },
          { row: 3, col: 7 },
          { row: 2, col: 7 }
        ]
      },
      {
        id: 'pink_right_01',
        color: 'pink',
        direction: 'right',
        head: { row: 3, col: 6 },
        cells: [
          { row: 7, col: 5 },
          { row: 6, col: 5 },
          { row: 5, col: 5 },
          { row: 4, col: 5 },
          { row: 3, col: 5 },
          { row: 3, col: 6 }
        ]
      },
      {
        id: 'gray_up_01',
        color: 'gray',
        direction: 'up',
        head: { row: 4, col: 2 },
        cells: [
          { row: 6, col: 3 },
          { row: 5, col: 3 },
          { row: 5, col: 2 },
          { row: 4, col: 2 }
        ]
      },
      {
        id: 'cyan_up_01',
        color: 'cyan',
        direction: 'up',
        head: { row: 7, col: 3 },
        cells: [
          { row: 4, col: 4 },
          { row: 5, col: 4 },
          { row: 6, col: 4 },
          { row: 7, col: 4 },
          { row: 8, col: 4 },
          { row: 8, col: 3 },
          { row: 7, col: 3 }
        ]
      },
      {
        id: 'cyan_down_01',
        color: 'cyan',
        direction: 'down',
        head: { row: 4, col: 7 },
        cells: [
          { row: 6, col: 6 },
          { row: 5, col: 6 },
          { row: 4, col: 6 },
          { row: 4, col: 7 }
        ]
      },
      {
  id: 'orange_up_01',
  color: 'orange',
  direction: 'up',
  head: { row: 6, col: 7 },
  cells: [
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
    { row: 8, col: 7 },
    { row: 7, col: 7 },
    { row: 6, col: 7 }
  ]
},
      {
        id: 'gray_up_02',
        color: 'gray',
        direction: 'up',
        head: { row: 8, col: 5 },
        cells: [
          { row: 9, col: 3 },
          { row: 9, col: 4 },
          { row: 9, col: 5 },
          { row: 8, col: 5 }
        ]
      },
      {
        id: 'green_up_02',
        color: 'green',
        direction: 'up',
        head: { row: 9, col: 5 },
        cells: [
          { row: 12, col: 5 },
          { row: 11, col: 5 },
          { row: 10, col: 5 },
          { row: 9, col: 5 }
        ]
      },
      {
        id: 'orange_left_01',
        color: 'orange',
        direction: 'left',
        head: { row: 11, col: 3 },
        cells: [
          { row: 9, col: 3 },
          { row: 9, col: 4 },
          { row: 10, col: 4 },
          { row: 11, col: 4 },
          { row: 11, col: 3 }
        ]
      },
      {
        id: 'gray_right_01',
        color: 'gray',
        direction: 'right',
        head: { row: 12, col: 4 },
        cells: [
          { row: 13, col: 3 },
          { row: 12, col: 3 },
          { row: 12, col: 4 }
        ]
      },
      {
        id: 'pink_up_01',
        color: 'pink',
        direction: 'up',
        head: { row: 12, col: 6 },
        cells: [
          { row: 13, col: 4 },
          { row: 13, col: 5 },
          { row: 13, col: 6 },
          { row: 12, col: 6 }
        ]
      }
    ],
    shooters: [
      {
        id: 'yellow_top_01',
        color: 'yellow',
        shots: 4,
        side: 'top',
        laneIndex: 4,
        isBlocked: false,
        directCoord: { row: -1, col: 4 }
      },
      {
        id: 'purple_top_01',
        color: 'purple',
        shots: 4,
        side: 'top',
        laneIndex: 5,
        isBlocked: false,
        directCoord: { row: -1, col: 5 }
      },
      {
        id: 'purple_top_02',
        color: 'purple',
        shots: 5,
        side: 'top',
        laneIndex: 2,
        isBlocked: false,
        directCoord: { row: -1, col: 2 }
      },
      {
        id: 'green_right_01',
        color: 'green',
        shots: 5,
        side: 'right',
        laneIndex: 2,
        isBlocked: false,
        directCoord: { row: 2, col: 10 }
      },
      {
        id: 'yellow_top_02',
        color: 'yellow',
        shots: 5,
        side: 'top',
        laneIndex: 7,
        isBlocked: false,
        directCoord: { row: -1, col: 7 }
      },
      {
        id: 'pink_right_01',
        color: 'pink',
        shots: 6,
        side: 'right',
        laneIndex: 3,
        isBlocked: false,
        directCoord: { row: 3, col: 10 }
      },
      {
        id: 'gray_top_01',
        color: 'gray',
        shots: 4,
        side: 'top',
        laneIndex: 2,
        isBlocked: false,
        directCoord: { row: -1, col: 2 }
      },
      {
        id: 'cyan_top_01',
        color: 'cyan',
        shots: 7,
        side: 'top',
        laneIndex: 3,
        isBlocked: false,
        directCoord: { row: -1, col: 3 }
      },
      {
        id: 'cyan_bottom_01',
        color: 'cyan',
        shots: 4,
        side: 'bottom',
        laneIndex: 7,
        isBlocked: false,
        directCoord: { row: 14, col: 7 }
      },
      {
  id: 'orange_top_01',
  color: 'orange',
  shots: 6,
  side: 'top',
  laneIndex: 7,
  isBlocked: false,
  directCoord: { row: -1, col: 7 }
},
      {
        id: 'gray_top_02',
        color: 'gray',
        shots: 4,
        side: 'top',
        laneIndex: 5,
        isBlocked: false,
        directCoord: { row: -1, col: 5 }
      },
      {
        id: 'green_top_02',
        color: 'green',
        shots: 4,
        side: 'top',
        laneIndex: 5,
        isBlocked: false,
        directCoord: { row: -1, col: 5 }
      },
      {
        id: 'orange_left_01',
        color: 'orange',
        shots: 5,
        side: 'left',
        laneIndex: 11,
        isBlocked: false,
        directCoord: { row: 11, col: -1 }
      },
      {
        id: 'gray_right_01',
        color: 'gray',
        shots: 3,
        side: 'right',
        laneIndex: 12,
        isBlocked: false,
        directCoord: { row: 12, col: 10 }
      },
      {
        id: 'pink_top_01',
        color: 'pink',
        shots: 4,
        side: 'top',
        laneIndex: 6,
        isBlocked: false,
        directCoord: { row: -1, col: 6 }
      }
    ]
  }
];