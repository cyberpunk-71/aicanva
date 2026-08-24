import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore } from "../../store/canvasStore";
import { GenericChatNode } from "../nodes/GenericChatNode";
import { SkybridgeNode } from "../nodes/SkybridgeNode";
import { ResearchNode } from "../nodes/ResearchNode";
import { CodePreviewNode } from "../nodes/CodePreviewNode";
import { ScratchpadNode } from "../nodes/ScratchpadNode";
import { MediaNode } from "../nodes/MediaNode";
import { StatusEdge } from "./edges/StatusEdge";
import { Minimap } from "./Minimap";
import { CanvasToolbar } from "./CanvasToolbar";

const nodeTypes: NodeTypes = {
  custom: GenericChatNode as unknown as NodeTypes["custom"],
  chat: GenericChatNode as unknown as NodeTypes["chat"],
  skybridge: SkybridgeNode as unknown as NodeTypes["skybridge"],
  research: ResearchNode as unknown as NodeTypes["research"],
  code: CodePreviewNode as unknown as NodeTypes["code"],
  scratchpad: ScratchpadNode as unknown as NodeTypes["scratchpad"],
  media: MediaNode as unknown as NodeTypes["media"],
};

const edgeTypes: EdgeTypes = {
  statusEdge: StatusEdge as unknown as EdgeTypes["statusEdge"],
};

export function CanvasViewport() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectNode } =
    useCanvasStore();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "statusEdge",
      animated: true,
      data: { status: "idle" },
    }),
    []
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={4}
        className="bg-canvas-bg"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1a1a2e"
        />
        <Controls />
        <Minimap />
        <Panel position="top-center">
          <CanvasToolbar />
        </Panel>
        <Panel position="bottom-left">
          <div className="text-[10px] text-slate-600 px-2 py-1">
            Canvas Core v0.1.0 • {nodes.length} nodes • {edges.length} edges
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
