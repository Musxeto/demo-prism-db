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
  Handle,
} from 'reactflow';
import dagre from 'dagre';
import { DatabaseRelationships } from '../../../shared/schema';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Search } from 'lucide-react';
import { Input } from './ui/input';
import { useRelationships } from '../hooks/use-relationships';
import 'reactflow/dist/style.css';

// Custom Table Node Component
const TableNode = ({ data }: { data: any }) => {
  const { table, onTableClick, isHighlighted } = data;
  
  return (
    <div 
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] relative ${
        isHighlighted ? 'border-blue-500 shadow-blue-200' : 'border-gray-300'
      }`}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#3B82F6', width: 8, height: 8 }}
      />
      <Handle
        type="source" 
        position={Position.Right}
        id="right"
        style={{ background: '#3B82F6', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#3B82F6', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#3B82F6', width: 8, height: 8 }}
      />
      
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
  onTableClick?: (tableName: string) => void;
}

// Auto-layout using Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Improved layout settings for better visualization
  dagreGraph.setGraph({ 
    rankdir: direction, 
    ranksep: 150,  // Increased spacing between ranks
    nodesep: 100,  // Increased spacing between nodes
    edgesep: 50,   // Space between edges
    marginx: 50,   // Margin around the graph
    marginy: 50
  });

  nodes.forEach((node) => {
    // Set larger node dimensions for better layout
    dagreGraph.setNode(node.id, { width: 250, height: 180 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // Center the node position
    node.targetPosition = direction === 'TB' ? Position.Top : Position.Left;
    node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;
    node.position = {
      x: nodeWithPosition.x - 125, // Half of width
      y: nodeWithPosition.y - 90,  // Half of height
    };
  });

  return { nodes, edges };
};

export default function ERDViewer({ connectionId, onTableClick }: ERDViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Fetch relationships data
  const { data: relationships, isLoading, error } = useRelationships(connectionId);

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

    console.log('Relationships data:', relationships);
    console.log('Number of relationships:', relationships.relationships?.length || 0);

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

    const initialEdges: Edge[] = relationships.relationships?.map((rel, index) => {
      console.log('Creating edge for relationship:', rel);
      return {
        id: `edge-${index}`,
        source: rel.fromTable,
        target: rel.toTable,
        label: `${rel.fromColumn} → ${rel.toColumn}`,
        type: 'smoothstep', // Use smoothstep for better visual connections
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 25,
          height: 25,
          color: '#3B82F6',
        },
        style: {
          strokeWidth: 3,
          stroke: '#3B82F6',
        },
        labelStyle: {
          fontSize: '12px',
          fontWeight: 600,
          fill: '#1F2937',
          backgroundColor: '#FFFFFF',
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: 1,
          stroke: '#E5E7EB',
          strokeWidth: 1,
          borderRadius: '4px',
        },
        // Add source and target handles for better connection points
        sourceHandle: 'right',
        targetHandle: 'left',
      };
    }) || [];

    console.log('Created edges:', initialEdges);

    console.log('Created edges:', initialEdges);

    // If no relationships exist, create sample ones for testing visualization
    let finalEdges = initialEdges;
    if (initialEdges.length === 0 && initialNodes.length > 1) {
      console.log('No relationships found, creating sample connections for testing');
      // Create a sample relationship between first few tables
      const sampleEdges: Edge[] = [];
      for (let i = 0; i < Math.min(initialNodes.length - 1, 3); i++) {
        sampleEdges.push({
          id: `sample-edge-${i}`,
          source: initialNodes[i].id,
          target: initialNodes[i + 1].id,
          label: `Sample FK → PK`,
          type: 'smoothstep',
          animated: true, // Make sample edges animated to show they're not real
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 25,
            height: 25,
            color: '#EF4444',
          },
          style: {
            strokeWidth: 2,
            stroke: '#EF4444',
            strokeDasharray: '8,8', // Dashed line for sample
          },
          labelStyle: {
            fontSize: '11px',
            fontWeight: 600,
            fill: '#EF4444',
            backgroundColor: '#FFFFFF',
          },
          labelBgStyle: {
            fill: '#FEF2F2',
            fillOpacity: 1,
            stroke: '#EF4444',
            strokeWidth: 1,
            borderRadius: '4px',
          },
        });
      }
      finalEdges = sampleEdges;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      finalEdges,
      layoutDirection
    );

    console.log('Layouted edges:', layoutedEdges);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading schema relationships...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error loading relationships: {error.message}</div>
      </div>
    );
  }

  if (!relationships) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">No relationship data available</div>
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
            {edges.length > 0 && ` (${edges.length} edges visible)`}
          </div>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400">
              Debug: {nodes.length} nodes, {edges.length} edges
            </div>
          )}
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
          fitViewOptions={{ padding: 50 }}
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            style: { strokeWidth: 3, stroke: '#3B82F6' },
          }}
          // Ensure edges are rendered above nodes
          elevateEdgesOnSelect={true}
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
