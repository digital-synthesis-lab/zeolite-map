// Load the CSV file
d3.csv("https://raw.githubusercontent.com/dskoda/Zeolites-AMD/main/data/iza_dm.csv").then(function(data) {
    // Function to find the shortest path between two nodes
    function findShortestPath(start, end) {
        const queue = [[start]];
        const visited = new Set([start]);

        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];

            if (node === end) {
                return path;
            }

            for (const link of links) {
                let next = null;
                if (link.source.id === node) {
                    next = link.target.id;
                } else if (link.target.id === node) {
                    next = link.source.id;
                }

                if (next && !visited.has(next)) {
                    visited.add(next);
                    queue.push([...path, next]);
                }
            }
        }

        return null; // No path found
    }
    // Get labels from the first column
    const labels = data.map(row => row[Object.keys(row)[0]]);

    // Parse the CSV data into a distance matrix
    const matrix = data.map(row => {
        const values = Object.values(row);
        return values.slice(1).map(Number);  // Exclude the first column (label)
    });

    const n = matrix.length;

    // Create nodes with labels
    const nodes = labels.map((label, i) => ({id: i, label: label}));

    // Function to create links based on number of nearest neighbors
    function createLinks(numNeighbors) {
        const links = [];
        for (let i = 0; i < n; i++) {
            const distances = matrix[i].map((d, j) => ({index: j, distance: d}));
            distances.sort((a, b) => a.distance - b.distance);
            for (let k = 1; k <= numNeighbors && k < distances.length; k++) {
                if (distances[k].index > i) {
                    links.push({
                        source: i,
                        target: distances[k].index,
                        distance: distances[k].distance
                    });
                }
            }
        }
        return links;
    }

    // Set up the SVG
    const width = document.getElementById('visualization').clientWidth;
    const height = 600;
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add a background rect for better zoom/pan interaction
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    const g = svg.append("g")
        .attr("class", "zoom-container");

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", zoomed);

    svg.call(zoom);

    // Create initial force simulation
    let simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-30))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Initialize with 4 nearest neighbors
    let links = createLinks(4);
    let link = g.append("g")
        .attr("class", "links")
        .selectAll("line");

    // Calculate node size based on label length and search status
    const getNodeSize = (label, isSelected) => {
        const baseSize = Math.max(20, label.length * 4);
        return isSelected ? baseSize * 1.5 : baseSize;
    };

    // Draw nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", d => getNodeSize(d.label, false) / 2)
        .attr("fill", "#69b3a2");

    // Add labels inside nodes
    const label = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.label)
        .attr("font-size", d => Math.min(10, getNodeSize(d.label) / 3))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "white");

    // Update the graph
    function updateGraph(numNeighbors) {
        links = createLinks(numNeighbors);

        link = link.data(links, d => `${d.source.id}-${d.target.id}`);
        link.exit().remove();
        link = link.enter().append("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .merge(link);

        // Update forces
        simulation
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("collide", d3.forceCollide().radius(d => getNodeSize(d.label, false) / 2 + 10))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1))
            .alpha(1)
            .restart();

        // Reapply search highlighting
        applySearch();
    }

    // Update positions on each tick of the simulation
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    // Zoom function
    function zoomed(event) {
        g.attr("transform", event.transform);
    }

    // Handle neighbor selection
    d3.select("#neighbors").on("change", function() {
        const numNeighbors = parseInt(this.value);
        updateGraph(numNeighbors);
    });

    // Apply search highlighting
    function applySearch() {
        const searchTerms = d3.select("#search").property("value").toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
        
        // Reset path highlighting
        link.attr("stroke", "#999").attr("stroke-width", 1);
        
        // Highlight selected nodes
        node.classed("highlighted", d => searchTerms.length > 0 && searchTerms.some(term => d.label.toLowerCase().includes(term)));
        
        // Highlight neighbors and edges
        const highlightedNodes = new Set();
        const highlightedLinks = new Set();
        
        if (searchTerms.length > 0) {
            nodes.forEach(d => {
                if (searchTerms.some(term => d.label.toLowerCase().includes(term))) {
                    highlightedNodes.add(d.id);
                    links.forEach(l => {
                        if (l.source.id === d.id || l.target.id === d.id) {
                            highlightedLinks.add(l);
                            highlightedNodes.add(l.source.id);
                            highlightedNodes.add(l.target.id);
                        }
                    });
                }
            });
        }
        
        node.classed("neighbor", d => !searchTerms.some(term => d.label.toLowerCase().includes(term)) && highlightedNodes.has(d.id));
        link.classed("highlighted-link", l => highlightedLinks.has(l));
        
        // Update node colors and sizes
        node.attr("fill", d => {
            if (searchTerms.some(term => d.label.toLowerCase().includes(term))) {
                return "#ff0000"; // Red for selected nodes
            } else if (highlightedNodes.has(d.id)) {
                return "#ff9999"; // Light red for neighbors
            } else {
                return "#69b3a2"; // Original color for other nodes
            }
        })
        .attr("r", d => getNodeSize(d.label, searchTerms.some(term => d.label.toLowerCase().includes(term))) / 2);

        // Update label font sizes
        label.attr("font-size", d => {
            const nodeSize = getNodeSize(d.label, searchTerms.some(term => d.label.toLowerCase().includes(term)));
            return Math.min(10, nodeSize / 3);
        });

        // Update simulation to account for new node sizes
        simulation.force("collide", d3.forceCollide().radius(d => getNodeSize(d.label, searchTerms.some(term => d.label.toLowerCase().includes(term))) / 2 + 10))
            .alpha(0.3)
            .restart();
    }

    // Handle search
    d3.select("#search").on("input", applySearch);

    // Handle path search
    d3.select("#findPath").on("click", function() {
        const pathLabels = d3.select("#pathSearch").property("value").toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
        if (pathLabels.length === 2) {
            const startNode = nodes.find(n => n.label.toLowerCase() === pathLabels[0]);
            const endNode = nodes.find(n => n.label.toLowerCase() === pathLabels[1]);
            if (startNode && endNode) {
                const path = findShortestPath(startNode.id, endNode.id);
                highlightPath(path);
            } else {
                console.log("One or both nodes not found");
            }
        } else {
            console.log("Please enter exactly two labels");
        }
    });

    function highlightPath(path) {
        // Reset previous highlighting
        node.attr("fill", "#69b3a2")
            .attr("stroke", null)
            .attr("stroke-width", null);
        link.attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", null);

        if (path) {
            // Highlight nodes in the path
            node.filter(d => path.includes(d.id))
                .attr("fill", "#ffa500") // Orange fill for path nodes
                .attr("stroke", "#ff4500") // Red-orange stroke for path nodes
                .attr("stroke-width", 3);

            // Highlight links in the path
            link.filter(d => {
                const sourceIndex = path.indexOf(d.source.id);
                const targetIndex = path.indexOf(d.target.id);
                return sourceIndex !== -1 && targetIndex !== -1 && Math.abs(sourceIndex - targetIndex) === 1;
            })
                .attr("stroke", "#ff4500") // Red-orange for path links
                .attr("stroke-width", 3)
                .attr("stroke-dasharray", "5,5"); // Dashed line for path links
        }
    }

    // Initial graph update
    updateGraph(4);
});
