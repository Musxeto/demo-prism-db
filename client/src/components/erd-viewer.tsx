import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  MarkerType,
  Position,
} from 'reactflow';
import dagre from 'dagre';
import { DatabaseRelationships } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import 'reactflow/dist/style.css';

// Custom Table Node Component
const TableNode = ({ data }: { data: any }) => {
  const { table, onTableClick, isHighlighted } = data;
  
  return (
    <div 
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] ${
        isHighlighted ? 'border-blue-500 shadow-blue-200' : 'border-gray-300'
      }`}
    >
      {/* Table Header */}
      <div 
        className="bg-slate-800 text-white px-3 py-2 rounded-t-lg cursor-pointer hover:bg-slate-700 transition-colors"
        onClick={() => onTableClick?.(table.name)}
      >
        <div className="font-semibold text-sm">{table.name}</div>
        <div className="text-xs text-slate-300">{table.rowCount} rows</div>
      </div>
      
      {/* Columns */}
      <div className="p-2 max-h-48 overflow-y-auto">
        {table.columns?.map((column: any, index: number) => (
          <div 
            key={index} 
            className={`flex items-center justify-between py-1 px-2 text-xs rounded ${
              column.isPrimaryKey 
                ? 'bg-yellow-50 border-l-2 border-yellow-400' 
                : column.isForeignKey 
                ? 'bg-blue-50 border-l-2 border-blue-400'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="font-mono text-slate-700 truncate">{column.name}</span>
              {column.isPrimaryKey && (
                <span className="text-yellow-600 font-bold text-[10px]">PK</span>
              )}
              {column.isForeignKey && (
                <span className="text-blue-600 font-bold text-[10px]">FK</span>
              )}
            </div>
            <span className="text-slate-500 text-[10px] ml-2">{column.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

interface ERDViewerProps {
  connectionId: number;
  relationships?: DatabaseRelationships;
  onTableClick?: (tableName: string) => void;
}

// Auto-layout using Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 150 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    node.position = {
      x: nodeWithPosition.x - 100,
      y: nodeWithPosition.y - 75,
    };
  });

  return { nodes, edges };
};

export default function ERDViewer({ connectionId, relationships, onTableClick }: ERDViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Filter and highlight nodes based on search
  const filteredAndHighlightedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isHighlighted: searchTerm && node.data.table.name.toLowerCase().includes(searchTerm.toLowerCase())
    }
  }));

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Convert relationships data to React Flow nodes and edges
  useEffect(() => {
    if (!relationships?.tables) return;

    const initialNodes: Node[] = relationships.tables.map((table, index) => ({
      id: table.name,
      type: 'table',
      position: { x: (index % 4) * 250, y: Math.floor(index / 4) * 200 },
      data: { 
        table,
        onTableClick,
        isHighlighted: false
      },
    }));

    const initialEdges: Edge[] = relationships.relationships?.map((rel, index) => ({
      id: `edge-${index}`,
      source: rel.fromTable,
      target: rel.toTable,
      label: `${rel.fromColumn} → ${rel.toColumn}`,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#374151',
      },
      style: {
        strokeWidth: 2,
        stroke: '#374151',
      },
      labelStyle: {
        fontSize: '10px',
        fontWeight: 500,
        fill: '#6B7280',
      },
      labelBgStyle: {
        fill: '#F9FAFB',
        fillOpacity: 0.8,
      },
    })) || [];

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      layoutDirection
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [relationships, layoutDirection, onTableClick, setNodes, setEdges]);

  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      layoutDirection
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  const toggleLayoutDirection = () => {
    setLayoutDirection(prev => prev === 'TB' ? 'LR' : 'TB');
  };

  if (!relationships) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading schema relationships...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Database Relationships - {relationships.database}
          </h3>
          <div className="text-sm text-slate-500">
            {relationships.tables?.length || 0} tables, {relationships.relationships?.length || 0} relationships
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          
          <Button 
            onClick={toggleLayoutDirection} 
            variant="outline" 
            size="sm"
            title={`Switch to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'} layout`}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={handleAutoLayout} 
            variant="outline" 
            size="sm"
            title="Auto-arrange tables"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={filteredAndHighlightedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls 
            showZoom={true}
            showFitView={true}
            showInteractive={true}
            position="top-right"
          />
          <MiniMap 
            nodeColor="#E5E7EB" 
            maskColor="rgba(0, 0, 0, 0.2)"
            position="bottom-right"
          />
          <Background color="#F1F5F9" gap={20} />
        </ReactFlow>
      </div>
    </div>
  );
}
