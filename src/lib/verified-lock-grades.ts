/** Reviewed original user-supplied pregame card. Grade-only recovery; never supplies odds, stakes or results. */
export const verifiedLockGrades=[
 {id:'lock:119',rank:1,card:'1 • BEARS +3  +100\nBears @ Seahawks',grade:'A+'},
 {id:'lock:120',rank:2,card:'2 • THUNDER +4  -110\nThunder @ Cavaliers',grade:'A'},
 {id:'lock:121',rank:3,card:'3 • SUNS +3\nSuns @ Warriors',grade:'A-'},
 {id:'lock:122',rank:4,card:'4 • PURDUE +5.5\nPurdue @ Gonzaga',grade:'B+'},
 {id:'lock:123',rank:5,card:'5 • HEAT +1.5\nHeat @ Lakers',grade:'B'},
].map(row=>({...row,date:'2026-11-02',analyst:"G' Money",source:'https://chatgpt.com/c/6ae8cd35-264c-83e9-a7ef-0be0bd50e325?messageId=05b6fbc1-654d-4ba0-b942-6e5aabbdda14',submittedAt:'2026-11-02T17:49:58.237Z',note:'User-supplied G Top 5 explicitly says these picks remain firmly locked. Applies only to the matching archived Top 5, not the conflicting Suns/Heat main-board sides. Missing prices and source limitations remain unchanged.'}));
