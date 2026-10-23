# Dev19 layout and pipe helper

Dev19 now lays out its visible machines around a 20 m square room, 4 m high. A weighted adjacency matrix derived from physical port graph edges guides placement so connected machines tend to sit nearer each other. The graph's control links do not affect physical placement.

The room's graph routes now call the commodity based `createLine` pipe helper. Gas, primary heating water, pool water, mains make-up water, electrical supply and flue each request a pipe or conduit using a nominal design capacity. The route builder retains square leads at every visual port. The gas lines receive a yellow service finish.

The pool mimic controls its temperature target and has a pool heating button connected to both the boiler and primary circulator. The simulation can heat the pool, then cool it after those devices are stopped while the pool pump continues. The boiler knob now uses a reactive bound value, so its rendered position tracks the control model when turned.

The current pipe helper chooses materials and dimensions but does not design route geometry. Dev19 still supplies the run points. A later routing pass can reduce overhead crossings without changing the helper call or port graph.
