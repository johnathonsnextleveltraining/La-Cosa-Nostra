/** Server-authoritative synchronization. Sport selection never enters this layer. */
export class BoardSync {
  revision = -1;
  date = '';
  private engineVersion = '';
  private loadedAt = 0;
  constructorClock:()=>number;
  private sequence = 0;
  private checking: Promise<void> | null = null;
  private disposed = false;
  private transport: {state:()=>Promise<any>;revision:()=>Promise<{revision:number;date:string;engineVersion?:string}>};
  private events: {data:(value:any)=>void;status:(value:'loading'|'saved'|'offline')=>void;error:(error:string)=>void};
  constructor(transport:BoardSync['transport'],events:BoardSync['events'],clock=Date.now){this.transport=transport;this.events=events;this.constructorClock=clock}
  async load() {
    const sequence = ++this.sequence;
    this.events.status('loading');
    try {
      const value = await this.transport.state();
      if (this.disposed || sequence !== this.sequence) return;
      if(typeof value.revision !== 'number')throw Error('Saved board revision is missing');
      if(value.revision < this.revision){this.events.status('saved');return;}
      this.revision = value.revision;
      this.date = value.date || '';
      this.engineVersion=value.engineVersion||'';
      this.loadedAt=this.constructorClock();
      this.events.data(value);
      this.events.error('');
      this.events.status('saved');
    } catch (error) {
      if (!this.disposed && sequence === this.sequence) {
        this.events.status('offline');
        this.events.error(String(error));
      }
    }
  }
  check() {
    if (this.checking) return this.checking;
    const sequence=this.sequence;
    this.checking = (async()=>{
      try {
        const current = await this.transport.revision();
        if(this.disposed||sequence!==this.sequence) return;
        if(this.constructorClock()-this.loadedAt>=300000 || current.revision > this.revision || current.date !== this.date || !!current.engineVersion && current.engineVersion!==this.engineVersion) await this.load();
        else {this.events.status('saved');this.events.error('')}
      } catch(error) {
        if(!this.disposed&&sequence===this.sequence){this.events.status('offline');this.events.error(String(error))}
      }
    })().finally(()=>{this.checking=null});
    return this.checking;
  }
  dispose(){this.disposed=true;this.sequence++}
}
