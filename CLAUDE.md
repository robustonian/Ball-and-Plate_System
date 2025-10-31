# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive web-based simulator for a ball-and-plate control system demonstrating control theory concepts. The system models a ball rolling on a tilting plate controlled by a PD controller with optional feedforward. Built with TypeScript, React, Vite, Zustand, and Tailwind CSS.

## Development Commands

### Basic Commands
```bash
# Install dependencies
npm install

# Start dev server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint TypeScript files
npm run lint

# Format code with Prettier
npm run format
```

### TypeScript
- Uses strict mode with all strict checks enabled (see tsconfig.json)
- No `any` types allowed - all code must be properly typed
- Target: ES2020 with DOM libraries
- TSC is run before build via `npm run build`

## Architecture

### Core Simulation Loop (App.tsx)
- Uses `requestAnimationFrame` for 60 fps rendering
- Fixed physics timestep (400 Hz / 2.5ms) with adaptive substepping
- Maximum 20 substeps per frame to prevent "spiral of death"
- Keyboard controls handled globally for play/pause/reset/mode switching

### State Management (state/store.ts)
- **Zustand** store manages all application state
- Key state divisions:
  - `simState`: Ball position/velocity (x, y, vx, vy, time)
  - `physicsParams`: Angle saturation, drag settings
  - `controllerConfig`: Gains (Kp, Kd), feedforward/approximation flags
  - `controllerState`: Current angles + rate limiters
  - `referenceManager`: Orchestrates reference generators based on mode

### Physics Engine (sim/physics.ts)
- **Integration**: 4th-order Runge-Kutta (RK4) for numerical stability
- **Dynamics**: Ball on tilted plate with solid sphere rolling physics
  - Acceleration: `a = (5/7)g * sin(θ)`
  - Constant `k = 7.007 m/s²` derived from sphere inertia
- **Boundary handling**: Collision with restitution coefficient (0.4)
- **Optional drag**: Air resistance term (`-c_d * v`)
- Input angles clamped to saturation limits before integration

### Controller (sim/controller.ts)
- **Type**: PD controller with optional feedforward
- **Control law**: `a_cmd = r̈ - Kd·ė - Kp·e`
- **Inverse kinematics**: `θ = arcsin(a_cmd / k)` (or small-angle approximation)
- **Rate limiting**: Configurable angle command rate limits (default 200 deg/s)
- **Gain presets**: Conservative/Medium/Aggressive for quick tuning
- **Manual input**: Additive angles can be applied in manual mode (arrow keys)

### Reference Generators (sim/reference.ts)
Five control modes coordinated by `ReferenceManager`:

1. **Stabilization**: Always returns origin (0, 0)
2. **Mouse Tracking**:
   - Low-pass filters raw mouse position (4 Hz cutoff)
   - Estimates velocity/acceleration via numerical differentiation with filtering
3. **Drawing Path**:
   - User draws points, converted to `CubicSpline2D` (currently linear interpolation between points)
   - Parametric trajectory with adjustable duration and loop mode
   - Evaluates position/velocity/acceleration along spline with chain rule scaling
4. **G-code Path**:
   - Supports both image-to-path conversion and G-code file loading
   - Image processing: Sobel edge detection + contour tracing + Douglas-Peucker simplification
   - G-code parser: Supports G00/G01 commands, absolute/relative coordinates (G90/G91), mm/inch units (G20/G21)
   - Paths scaled to plate coordinates and converted to `CubicSpline2D` for smooth tracking
   - Adjustable duration and loop mode (default 15s)
5. **Manual**: No automatic reference, user directly controls plate angles via arrow keys
   - Arrow keys map intuitively: ↑ moves ball up (positive φ), → moves ball right (positive θ)

### Math Utilities (utils/math.ts)
- **LowPassFilter**: First-order IIR filter for smoothing
- **DerivativeEstimator**: Numerical differentiation with low-pass filtering
- **RateLimiter**: Slew rate limiting for angle commands
- **CubicSpline2D**: Piecewise path interpolation (simplified implementation using linear segments with arc-length parameterization)

### G-code and Image Processing Utilities (utils/gcode.ts)
- **Image Processing Pipeline**:
  - Canvas API for client-side image loading and manipulation
  - Grayscale conversion (weighted RGB: 0.299R + 0.587G + 0.114B)
  - Sobel edge detection with configurable threshold (default 128)
  - Moore-Neighbor contour tracing algorithm
  - Douglas-Peucker path simplification (configurable tolerance)
  - Automatic scaling and centering to plate coordinates
- **G-code Parser**:
  - Supports G00 (rapid move) and G01 (linear interpolation) commands
  - Handles G90 (absolute) and G91 (relative) positioning
  - Unit conversion for G20 (inches) and G21 (millimeters)
  - Comment stripping (semicolon-delimited)
  - Automatic path scaling to fit plate size (default 0.4m target)
- **Path Utilities**:
  - Path length calculation for trajectory metadata
  - Coordinate normalization and bounding box computation

### React Components
- **CanvasView.tsx**: Renders simulation state using Canvas 2D API with high-DPI support
- **ChartView.tsx**: Real-time angle chart showing θ, φ, and error over time with grid, saturation lines, and legend
- **ThreeView.tsx**: Interactive 3D visualization using Three.js with React Three Fiber
  - Plate geometry with tilt based on θ and φ angles
    - Rotation mapping: `rotation.x = -phi`, `rotation.y = theta`
    - Negative phi ensures correct tilt direction (phi > 0 tilts plate down in +Y)
  - Ball with metallic material and shadows
    - Ball position calculated to follow tilted plate surface
    - Height formula: `z = ballRadius - x*sin(theta) - y*sin(phi)`
    - Maintains contact with plate regardless of tilt angle
  - OrbitControls for camera manipulation (drag to rotate, scroll to zoom)
  - Grid helper and coordinate axes
  - Directional/ambient/point lighting
  - Note: 3D trajectory currently disabled (doesn't follow plate surface)
- **ControlPanel.tsx**: UI for adjusting gains, modes, physics parameters, and display settings
- **App.tsx**: Top-level component managing animation loop and keyboard input

## Key Behaviors

### Simulation Step Flow
1. `App.tsx` animation loop calls `store.step(deltaTime)`
2. Adaptive substepping: divide frame into fixed physics timesteps
3. For each substep:
   - Get reference from `referenceManager` based on current mode
   - Compute control angles via PD controller
   - Integrate dynamics with RK4
   - Handle boundary collisions
4. Update trajectory trail and angle history (time-windowed ring buffer)
5. Store latest state

### Controller State
- Rate limiters maintain previous angle values and enforce slew rate limits
- When gains/settings change, controller state persists (not reset)
- Explicit reset via `resetControllerState()` zeros angles and rate limiter state

### Drawing Mode Workflow
1. Enter drawing mode → `isDrawing = true`
2. Mouse moves add points to `drawingPath` array
3. Finish drawing → create `CubicSpline2D` from points
4. Play/pause/loop controls manage trajectory playback
5. Spline evaluated at `t ∈ [0, 1]` scaled by duration for velocity/acceleration

### G-code Mode Workflow
1. Select G-code mode from Control Panel
2. **Image Upload**:
   - Upload PNG/JPG image file
   - Adjust edge threshold (50-200, higher = fewer edges detected)
   - Adjust point reduction (0.1%-5%, higher = fewer points)
   - Image processed client-side to extract contour path
3. **G-code File Upload**:
   - Upload .nc/.gcode/.txt file
   - Parser extracts coordinates from G00/G01 commands
   - Automatically handles different units and coordinate modes
4. Path metadata displayed (source, filename, point count, path length)
5. Adjust duration (5-60s) and enable/disable loop mode
6. Play/pause/reset controls manage trajectory playback
7. Spline evaluated at `t ∈ [0, 1]` scaled by duration for velocity/acceleration

## Physics Constants
- Gravity: `g = 9.81 m/s²`
- Sphere coefficient: `k = (5/7) * g ≈ 7.007 m/s²`
- Plate size: `0.5m` (square)
- Default angle saturation: `±15°`
- Default rate limit: `200 deg/s`

## Implementation Notes

### When modifying gains or physics parameters:
- Gain changes update `controllerConfig` immediately
- Physics changes (angle saturation) update `physicsParams`
- Rate limit changes must call `updateRateLimiters()` to update internal state

### Adding new control modes:
1. Define mode type in `reference.ts` `ControlMode` union
2. Implement generator class (follow pattern of `MouseReferenceGenerator` or `GCodeReferenceGenerator`)
3. Add to `ReferenceManager.getReference()` switch statement
4. Update UI in `ControlPanel.tsx` dropdown
5. Add to mode cycling in `App.tsx` keyboard handler (KeyM)

### Testing controller behavior:
- Use aggressive gains to see oscillations/instability
- Enable feedforward to improve tracking (especially for drawing and G-code modes)
- Small angle approximation is faster but less accurate at large angles
- Mouse mode demonstrates tracking with velocity/acceleration estimation
- Drawing mode shows user-created paths with adjustable duration
- G-code mode allows testing with complex, precise paths from images or CNC files
- Use angle chart (Display tab) to observe overshoot, settling time, and oscillations
- Chart shows θ (red), φ (blue), and tracking error (green) with saturation limits marked
- Use 3D view (Display tab) to visualize plate tilt and ball motion in 3D space
- Drag to rotate camera, scroll to zoom in 3D view
- Trail length configurable from 0-5000 points for long trajectory visualization
