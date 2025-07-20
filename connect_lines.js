class YarnConnectGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.shapesContainer = document.getElementById('shapesContainer');
        
        // Initialize properties before calling resizeCanvas
        this.currentLevel = 1;
        this.shapes = [];
        this.lines = [];
        this.isDragging = false;
        this.startShape = null;
        this.currentLine = null;
        this.establishedWaypoints = []; // Store waypoints that have been established during current drag
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#AB47BC', '#66BB6A'];
        this.shapeTypes = ['triangle', 'square', 'circle', 'diamond'];
        
        this.setupEventListeners();
        this.generateLevel();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.redrawLines();
    }

    setupEventListeners() {
        // Mouse events
        this.shapesContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', (e) => this.endDrag(e));
        
        // Touch events
        this.shapesContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrag(e.touches[0]);
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onDrag(e.touches[0]);
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.endDrag(e.changedTouches[0]);
        }, { passive: false });
    }

    generateLevel() {
        console.log(`Generating level ${this.currentLevel}`);
        this.clearLevel();
        document.getElementById('levelInfo').textContent = `Level ${this.currentLevel}`;
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('winMessage').style.display = 'none';
        
        const pairCount = Math.min(2 + Math.floor(this.currentLevel / 2), 8);
        console.log(`Creating ${pairCount} pairs`);
        
        // Use viewport dimensions for positioning
        const margin = 100;
        const gameWidth = window.innerWidth - margin * 2;
        const gameHeight = window.innerHeight - margin * 2;
        
        this.shapes = [];
        
        for (let i = 0; i < pairCount; i++) {
            const color = this.colors[i % this.colors.length];
            const shapeType = this.shapeTypes[i % this.shapeTypes.length];
            const pairId = i;
            
            console.log(`Creating pair ${i}: ${shapeType} in ${color}`);
            
            // Create two shapes for each pair
            for (let j = 0; j < 2; j++) {
                let x, y;
                let attempts = 0;
                
                // Generate position with safety check
                do {
                    x = margin + Math.random() * gameWidth;
                    y = margin + Math.random() * gameHeight;
                    attempts++;
                } while (this.isPositionTooClose(x, y) && attempts < 100);
                
                console.log(`Shape ${i}-${j} position: (${x}, ${y})`);
                
                const shape = this.createShape(x, y, color, shapeType, pairId);
                this.shapes.push(shape);
                this.shapesContainer.appendChild(shape.element);
            }
        }
        
        console.log(`Total shapes created: ${this.shapes.length}`);
        console.log('Shapes container children:', this.shapesContainer.children.length);
    }

    isPositionTooClose(x, y, minDistance = 80) {
        return this.shapes.some(shape => {
            const dx = shape.x - x;
            const dy = shape.y - y;
            return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });
    }

    createShape(x, y, color, type, pairId) {
        console.log(`Creating ${type} shape at (${x}, ${y}) with color ${color}`);
        
        const element = document.createElement('div');
        element.className = `shape ${type}`;
        
        // Adjust position to center the shape
        const adjustedX = x - 25; // Half of shape size for centering
        const adjustedY = y - 25;
        
        element.style.left = adjustedX + 'px';
        element.style.top = adjustedY + 'px';
        element.style.position = 'absolute';
        element.style.zIndex = '3';
        
        // Set color based on shape type
        if (type === 'triangle') {
            element.style.borderBottomColor = color;
        } else {
            element.style.backgroundColor = color;
        }
        
        const shape = {
            element,
            x: x, // Store center position
            y: y,
            color,
            type,
            pairId,
            connected: false
        };
        
        element.shape = shape;
        
        console.log(`Shape created:`, shape);
        
        return shape;
    }

    startDrag(e) {
        const target = e.target.closest('.shape');
        if (!target || target.shape.connected) return;
        
        console.log('Starting drag from shape:', target.shape);
        
        this.isDragging = true;
        this.startShape = target.shape;
        this.establishedWaypoints = []; // Reset waypoints for new drag
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Initialize with simple direct line first
        this.currentLine = {
            path: [
                { x: this.startShape.x, y: this.startShape.y },
                { x: mouseX, y: mouseY }
            ],
            color: this.startShape.color,
            temporary: true,
            isElastic: true
        };
        
        target.style.transform = 'scale(1.2)';
        this.redrawLines();
    }

    onDrag(e) {
        if (!this.isDragging || !this.currentLine) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Build path incrementally: start + established waypoints + current segment to mouse
        this.updateElasticPath(mouseX, mouseY);
        
        this.redrawLines();
    }
    
    updateElasticPath(mouseX, mouseY) {
        // First, check if we should remove any existing waypoints due to angle reversal
        this.checkAndRemoveReversedWaypoints(mouseX, mouseY);
        
        // Start building the path from the start shape
        let currentPath = [{ x: this.startShape.x, y: this.startShape.y }];
        
        // Add all remaining established waypoints
        currentPath = currentPath.concat(this.establishedWaypoints.map(wp => ({ x: wp.x, y: wp.y })));
        
        // Determine the last point we're drawing from
        const lastPoint = currentPath[currentPath.length - 1];
        
        // Check if the line from last point to mouse intersects any new shapes
        const currentSegment = {
            startX: lastPoint.x,
            startY: lastPoint.y,
            endX: mouseX,
            endY: mouseY
        };
        
        // Find shapes that this segment intersects (excluding already used ones)
        const usedShapePositions = new Set(
            this.establishedWaypoints.map(wp => `${wp.x},${wp.y}`)
        );
        
        const availableShapes = this.shapes.filter(shape => 
            shape !== this.startShape &&
            !shape.connected &&
            !usedShapePositions.has(`${shape.x},${shape.y}`)
        );
        
        // Find the closest intersecting shape
        let newWaypoint = null;
        let closestDistance = Infinity;
        
        for (const shape of availableShapes) {
            if (this.simpleLineIntersectsShape(currentSegment, shape)) {
                const distance = Math.sqrt(
                    Math.pow(shape.x - lastPoint.x, 2) + 
                    Math.pow(shape.y - lastPoint.y, 2)
                );
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    // Calculate the bending direction when establishing this waypoint
                    const entryVectorX = shape.x - lastPoint.x;
                    const entryVectorY = shape.y - lastPoint.y;
                    const exitVectorX = mouseX - shape.x;
                    const exitVectorY = mouseY - shape.y;
                    const bendDirection = this.crossProduct2D(entryVectorX, entryVectorY, exitVectorX, exitVectorY);
                    
                    newWaypoint = { 
                        x: shape.x, 
                        y: shape.y,
                        bendDirection: bendDirection // Positive = counterclockwise, Negative = clockwise
                    };
                }
            }
        }
        
        // If we found a new waypoint, add it to established waypoints
        if (newWaypoint) {
            this.establishedWaypoints.push(newWaypoint);
            currentPath.push({ x: newWaypoint.x, y: newWaypoint.y });
        }
        
        // Always add the current mouse position as the final point
        currentPath.push({ x: mouseX, y: mouseY });
        
        // Update the current line
        this.currentLine = {
            path: currentPath,
            color: this.startShape.color,
            temporary: true,
            isElastic: true
        };
    }
    
    checkAndRemoveReversedWaypoints(mouseX, mouseY) {
        // Check each waypoint from the end backwards to see if we should remove it
        for (let i = this.establishedWaypoints.length - 1; i >= 0; i--) {
            const waypoint = this.establishedWaypoints[i];
            
            // Get the point before this waypoint
            const prevPoint = i === 0 ? 
                { x: this.startShape.x, y: this.startShape.y } : 
                this.establishedWaypoints[i - 1];
            
            // Calculate the current bending direction
            const entryVectorX = waypoint.x - prevPoint.x;
            const entryVectorY = waypoint.y - prevPoint.y;
            const currentExitVectorX = mouseX - waypoint.x;
            const currentExitVectorY = mouseY - waypoint.y;
            const currentBendDirection = this.crossProduct2D(entryVectorX, entryVectorY, currentExitVectorX, currentExitVectorY);
            
            // Check if the bending direction has reversed
            const originalBendDirection = waypoint.bendDirection;
            
            // Use a threshold to avoid flickering near zero
            const threshold = 100; // Adjust this value as needed
            
            // If the current bending direction is opposite to the original (and significant)
            if ((originalBendDirection > threshold && currentBendDirection < -threshold) ||
                (originalBendDirection < -threshold && currentBendDirection > threshold)) {
                
                console.log(`Removing waypoint ${i} - bending direction reversed from ${originalBendDirection} to ${currentBendDirection}`);
                // Remove this waypoint and all subsequent ones
                this.establishedWaypoints.splice(i);
                break;
            }
        }
    }
    
    
    crossProduct2D(ax, ay, bx, by) {
        return ax * by - ay * bx;
    }
    
    simpleLineIntersectsShape(line, shape) {
        // Simple distance-based collision detection
        const shapeRadius = 25;
        
        // Calculate the distance from shape center to line segment
        const A = line.endY - line.startY;
        const B = line.startX - line.endX;
        const C = line.endX * line.startY - line.startX * line.endY;
        
        const denominator = Math.sqrt(A * A + B * B);
        if (denominator === 0) return false;
        
        const distance = Math.abs(A * shape.x + B * shape.y + C) / denominator;
        
        // Also check if the closest point on the line segment is actually within the segment
        const lineLength = Math.sqrt(
            Math.pow(line.endX - line.startX, 2) + 
            Math.pow(line.endY - line.startY, 2)
        );
        
        if (lineLength === 0) return false;
        
        const t = Math.max(0, Math.min(1, 
            ((shape.x - line.startX) * (line.endX - line.startX) + 
             (shape.y - line.startY) * (line.endY - line.startY)) / (lineLength * lineLength)
        ));
        
        const projX = line.startX + t * (line.endX - line.startX);
        const projY = line.startY + t * (line.endY - line.startY);
        
        const distToSegment = Math.sqrt(
            Math.pow(shape.x - projX, 2) + 
            Math.pow(shape.y - projY, 2)
        );
        
        return distToSegment <= shapeRadius;
    }

    endDrag(e) {
        if (!this.isDragging) return;
        
        console.log('Ending drag');
        
        this.isDragging = false;
        
        if (this.startShape) {
            this.startShape.element.style.transform = '';
        }
        
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const endShape = target?.closest('.shape')?.shape;
        
        console.log('End shape:', endShape);
        
        if (endShape && 
            endShape !== this.startShape && 
            endShape.pairId === this.startShape.pairId && 
            !endShape.connected) {
            
            console.log('Valid connection attempt');
            
            // Use the current established path, but replace the final mouse position with the end shape
            let finalPath = [{ x: this.startShape.x, y: this.startShape.y }];
            finalPath = finalPath.concat(this.establishedWaypoints);
            finalPath.push({ x: endShape.x, y: endShape.y });
            
            if (!this.checkPathIntersections(finalPath)) {
                console.log('Elastic path added successfully');
                this.lines.push({
                    path: finalPath,
                    color: this.startShape.color,
                    temporary: false,
                    isElastic: true
                });
                this.startShape.connected = true;
                endShape.connected = true;
                this.startShape.element.classList.add('connected');
                endShape.element.classList.add('connected');
                
                this.checkWinCondition();
            } else {
                console.log('Path intersects with existing lines - clearing all lines');
                this.clearAllLines();
            }
        }
        
        this.currentLine = null;
        this.startShape = null;
        this.establishedWaypoints = []; // Reset for next drag
        this.redrawLines();
    }

    calculateRealTimeElasticPath(startX, startY, endX, endY) {
        // Start with a direct line from start to current mouse position
        let currentPath = [{ x: startX, y: startY }];
        let currentX = startX;
        let currentY = startY;
        let usedWaypoints = new Set(); // Track which shapes we've already used as waypoints
        
        // Get all shapes that could be waypoints (excluding start shape)
        const allPotentialWaypoints = this.shapes.filter(shape => 
            shape !== this.startShape && 
            !shape.connected // Don't use already connected shapes as waypoints
        );
        
        // Use elastic band simulation - find shapes that the line would hit
        while (true) {
            const directLine = {
                startX: currentX,
                startY: currentY,
                endX: endX,
                endY: endY
            };
            
            // Find the closest shape that this direct line would intersect
            // Only consider shapes we haven't used yet
            let closestIntersection = null;
            let closestDistance = Infinity;
            
            for (const shape of allPotentialWaypoints) {
                if (usedWaypoints.has(shape)) continue; // Skip already used waypoints
                
                if (this.stableLineIntersectsShape(directLine, shape)) {
                    const distance = Math.sqrt(
                        Math.pow(shape.x - currentX, 2) + 
                        Math.pow(shape.y - currentY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIntersection = shape;
                    }
                }
            }
            
            if (closestIntersection) {
                // Add this shape as a waypoint and continue from there
                currentPath.push({ x: closestIntersection.x, y: closestIntersection.y });
                currentX = closestIntersection.x;
                currentY = closestIntersection.y;
                
                // Mark this shape as used - once used, never remove from path
                usedWaypoints.add(closestIntersection);
            } else {
                // No more intersections, add final point
                currentPath.push({ x: endX, y: endY });
                break;
            }
            
            // Safety check to prevent infinite loops
            if (currentPath.length > 10) {
                currentPath.push({ x: endX, y: endY });
                break;
            }
        }
        
        // DO NOT optimize - return the path as is to maintain stability
        // Once a waypoint is established, it should stay
        return currentPath;
    }
    
    stableLineIntersectsShape(line, shape) {
        // Use circle-based collision detection for more stable results
        const shapeRadius = 25; // Shape collision radius
        
        // Calculate distance from line to shape center
        const A = line.endY - line.startY;
        const B = line.startX - line.endX;
        const C = line.endX * line.startY - line.startX * line.endY;
        
        const distance = Math.abs(A * shape.x + B * shape.y + C) / Math.sqrt(A * A + B * B);
        
        // Also check if line segment actually passes near the shape (not just the infinite line)
        const lineLength = Math.sqrt(
            Math.pow(line.endX - line.startX, 2) + 
            Math.pow(line.endY - line.startY, 2)
        );
        
        if (lineLength === 0) return false;
        
        // Project shape center onto line segment
        const t = Math.max(0, Math.min(1, 
            ((shape.x - line.startX) * (line.endX - line.startX) + 
             (shape.y - line.startY) * (line.endY - line.startY)) / (lineLength * lineLength)
        ));
        
        const projX = line.startX + t * (line.endX - line.startX);
        const projY = line.startY + t * (line.endY - line.startY);
        
        const distToSegment = Math.sqrt(
            Math.pow(shape.x - projX, 2) + 
            Math.pow(shape.y - projY, 2)
        );
        
        return distToSegment <= shapeRadius;
    }

    findElasticPath(startShape, endShape) {
        // Use the real-time calculation for final path as well
        return this.calculateRealTimeElasticPath(
            startShape.x, 
            startShape.y, 
            endShape.x, 
            endShape.y
        );
    }
    
    pathIntersectsShapes(path, shapesToAvoid) {
        for (let i = 0; i < path.length - 1; i++) {
            const segment = {
                startX: path[i].x,
                startY: path[i].y,
                endX: path[i + 1].x,
                endY: path[i + 1].y
            };
            
            // Check if this segment passes through any shapes we should avoid
            for (const shape of shapesToAvoid) {
                if (this.lineIntersectsShape(segment, shape)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    lineIntersectsShape(line, shape) {
        // Simple rectangular collision detection for shapes
        const shapeRadius = 25; // Half the shape size
        const left = shape.x - shapeRadius;
        const right = shape.x + shapeRadius;
        const top = shape.y - shapeRadius;
        const bottom = shape.y + shapeRadius;
        
        // Check if line intersects the shape's bounding box
        return this.lineIntersectsRect(line, left, top, right, bottom);
    }
    
    lineIntersectsRect(line, left, top, right, bottom) {
        // Check if line segment intersects with rectangle
        const x1 = line.startX, y1 = line.startY;
        const x2 = line.endX, y2 = line.endY;
        
        // Check if either endpoint is inside the rectangle
        if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
            (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
            return true;
        }
        
        // Check intersection with rectangle edges
        return this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||    // top edge
               this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) || // right edge
               this.lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) || // bottom edge
               this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top);     // left edge
    }
    
    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    checkPathIntersections(path) {
        for (const existingLine of this.lines) {
            if (this.pathIntersectsLine(path, existingLine)) {
                return true;
            }
        }
        return false;
    }
    
    pathIntersectsLine(path, line) {
        for (let i = 0; i < path.length - 1; i++) {
            const segment = {
                startX: path[i].x,
                startY: path[i].y,
                endX: path[i + 1].x,
                endY: path[i + 1].y
            };
            
            if (line.isElastic) {
                // Check against elastic path
                if (this.pathIntersectsPath(path, line.path)) {
                    return true;
                }
            } else {
                // Check against straight line
                if (this.linesIntersect(segment, line)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    pathIntersectsPath(path1, path2) {
        for (let i = 0; i < path1.length - 1; i++) {
            for (let j = 0; j < path2.length - 1; j++) {
                const segment1 = {
                    startX: path1[i].x,
                    startY: path1[i].y,
                    endX: path1[i + 1].x,
                    endY: path1[i + 1].y
                };
                const segment2 = {
                    startX: path2[j].x,
                    startY: path2[j].y,
                    endX: path2[j + 1].x,
                    endY: path2[j + 1].y
                };
                
                if (this.linesIntersect(segment1, segment2)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkLineIntersections(newLine) {
        for (const line of this.lines) {
            if (this.linesIntersect(newLine, line)) {
                return true;
            }
        }
        return false;
    }

    linesIntersect(line1, line2) {
        const x1 = line1.startX, y1 = line1.startY;
        const x2 = line1.endX, y2 = line1.endY;
        const x3 = line2.startX, y3 = line2.startY;
        const x4 = line2.endX, y4 = line2.endY;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
    }

    clearAllLines() {
        this.lines = [];
        this.shapes.forEach(shape => {
            shape.connected = false;
            shape.element.classList.remove('connected');
        });
        this.redrawLines();
    }

    checkWinCondition() {
        if (this.shapes.every(shape => shape.connected)) {
            console.log('Win condition met!');
            setTimeout(() => {
                document.getElementById('winMessage').style.display = 'block';
                document.getElementById('nextBtn').style.display = 'inline-block';
            }, 500);
        }
    }

    redrawLines() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw permanent lines
        this.lines.forEach(line => {
            this.drawLine(line);
        });
        
        // Draw temporary line
        if (this.currentLine) {
            this.drawLine(this.currentLine);
        }
    }

    drawLine(line) {
        this.ctx.strokeStyle = line.color || '#333';
        this.ctx.lineWidth = line.temporary ? 3 : 5;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = line.temporary ? 0.7 : 1;
        
        if (line.isElastic && line.path) {
            // Draw elastic path with multiple segments
            this.ctx.beginPath();
            this.ctx.moveTo(line.path[0].x, line.path[0].y);
            
            for (let i = 1; i < line.path.length; i++) {
                this.ctx.lineTo(line.path[i].x, line.path[i].y);
            }
            
            this.ctx.stroke();
        } else {
            // Draw straight line (legacy support)
            this.ctx.beginPath();
            this.ctx.moveTo(line.startX, line.startY);
            this.ctx.lineTo(line.endX, line.endY);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }

    clearLevel() {
        console.log('Clearing level');
        this.shapesContainer.innerHTML = '';
        this.shapes = [];
        this.lines = [];
        this.isDragging = false;
        this.startShape = null;
        this.currentLine = null;
        this.redrawLines();
    }

    restartLevel() {
        console.log('Restarting level');
        this.generateLevel();
    }

    nextLevel() {
        console.log('Moving to next level');
        this.currentLevel++;
        this.generateLevel();
    }
}

// Initialize game when page loads
let game;

function initializeGame() {
    if (!game) {
        console.log('Initializing game');
        game = new YarnConnectGame();
    }
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}