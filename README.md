# Ball and Plate System Simulator

An interactive web-based simulator for a ball-and-plate control system, implemented with TypeScript, React, Vite, and Tailwind CSS.

![Ball and Plate System](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## Overview

This application simulates a ball rolling on a tilting plate, controlled by a PD (Proportional-Derivative) controller with optional feedforward. The system demonstrates fundamental concepts in control theory, including:

- **Nonlinear dynamics** with angle saturation
- **PD control** with derivative action and optional feedforward
- **Rate limiting** to simulate actuator constraints
- **Reference trajectory generation** with different tracking modes
- **Real-time simulation** at 400 Hz with 60 fps rendering

## Features

### Control Modes

1. **Stabilization Mode**: Maintains the ball at the origin (0, 0)
2. **Mouse Tracking Mode**: Ball follows your mouse cursor with smooth filtering
3. **Drawing Path Mode**: Draw a custom path for the ball to follow
4. **Manual Control Mode**: Direct control using arrow keys

### Real-Time Angle Visualization

- **Angle Chart**: Live time-series plot showing θ (red), φ (blue), and tracking error (green)
- Displays control behavior including overshoot, settling time, and oscillations
- Configurable history window (5-30 seconds)
- Saturation limits clearly marked for performance analysis
- Essential tool for understanding PD controller behavior and tuning

### Physics Model

The system models a solid sphere rolling on a tilted plate:

```
Ball dynamics:
  ẍ = k sin(θ)
  ÿ = k sin(φ)

Where:
  - k = (5/7)g ≈ 7.007 m/s² (solid sphere)
  - θ = pitch angle (rotation around x-axis)
  - φ = roll angle (rotation around y-axis)
  - g = 9.81 m/s² (gravitational acceleration)
```

### Controller

PD controller with feedforward acceleration compensation:

```
Position error:   e = x - r
Velocity error:   ė = ẋ - ṙ

Control law:
  a_cmd = r̈ (feedforward) - Kd·ė - Kp·e
  θ_cmd = arcsin(a_cmd_x / k)
  φ_cmd = arcsin(a_cmd_y / k)

With:
  - Rate limiting on angle commands (default: 200 deg/s)
  - Angle saturation (default: ±15°)
```

### Technical Details

- **Integration**: 4th-order Runge-Kutta (RK4) with dt = 0.0025s (400 Hz)
- **Rendering**: 60 fps using Canvas 2D API
- **Boundary Handling**: Collision detection with velocity damping (restitution = 0.4)
- **State Management**: Zustand for reactive state updates
- **High DPI Support**: Automatic scaling for Retina displays

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/robustonian/Ball-and-Plate_System.git
cd Ball-and-Plate_System
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Building for Production

```bash
npm run build
npm run preview
```

## Usage Guide

### Keyboard Shortcuts

- **Space**: Play/Pause simulation
- **R**: Reset to initial state (origin)
- **I**: Enter "Set Initial Position" mode (click on canvas to place ball)
- **M**: Cycle through control modes
- **Arrow Keys**: Manual control (move the ball directly)
  - ↑: Move ball up (positive φ)
  - ↓: Move ball down (negative φ)
  - ←: Move ball left (negative θ)
  - →: Move ball right (positive θ)

### Control Panel

#### Control Tab

- **Control Mode**: Select between Stabilization, Mouse, Drawing, or Manual
- **Gain Presets**: Quick presets for Conservative, Medium, or Aggressive tuning
- **PD Gains**:
  - Kp (Position gain): Controls response to position error
  - Kd (Velocity gain): Controls damping and overshoot
- **Controller Options**:
  - Use Feedforward: Enable acceleration feedforward for better tracking
  - Small Angle Approximation: Use θ ≈ sin(θ) instead of θ = arcsin(...)
- **Max Rate**: Angle command rate limit in deg/s

#### Physics Tab

- **Physical Constants**: Display of g, k, and plate size
- **Angle Saturation**: Maximum tilt angle (5-30°)
- **Air Resistance**: Optional velocity damping

#### Display Tab

- **Trail Length**: Number of trajectory points to display (0-1000)
- **Show Angle Chart**: Toggle real-time angle visualization
- **Chart History**: Time window for angle chart (5-30 seconds)

### Drawing Mode

1. Select "Drawing Path" from Control Mode dropdown
2. Click "Start Drawing"
3. Move your mouse on the canvas to draw a path
4. Click "Finish" to create a spline-interpolated trajectory
5. Use Play/Pause/Reset to control playback
6. Enable "Loop" for continuous repetition

## Theory

### System Dynamics

The ball-and-plate system is a classic benchmark in control theory. A ball rolls on a flat plate that can be tilted in two perpendicular directions. The goal is to control the ball's position by adjusting the plate angles.

For a solid sphere on an inclined plane:
- Acceleration down the slope: a = (g sin θ) / (1 + I/(mr²))
- For a solid sphere: I = (2/5)mr²
- Therefore: a = (5/7)g sin θ

### Control Strategy

The PD controller computes a desired acceleration and maps it to a required tilt angle:

1. **Error Calculation**: Compute position and velocity errors relative to the reference
2. **PD Law**: Generate acceleration command from proportional and derivative terms
3. **Feedforward**: Add reference acceleration for improved tracking (optional)
4. **Inverse Kinematics**: Convert acceleration to angle via arcsin (or small-angle approximation)
5. **Rate Limiting**: Limit the rate of change of angle commands
6. **Saturation**: Clamp angles to maximum tilt

### Tuning Guidelines

- **Kp too low**: Slow response, large steady-state error
- **Kp too high**: Oscillations, potential instability
- **Kd too low**: Overshoot, oscillations
- **Kd too high**: Sluggish response, noise sensitivity

Start with the "Medium" preset and adjust based on:
- Increase Kp for faster response
- Increase Kd to reduce overshoot
- Enable feedforward for tracking moving targets

### Stability Considerations

The maximum acceleration the system can produce is:
```
a_max = k sin(θ_max)
```

For the default θ_max = 15°:
```
a_max ≈ 7.007 × sin(15°) ≈ 1.81 m/s²
```

If the controller commands acceleration beyond this limit, the arcsin will saturate. The controller remains stable due to PD structure (no integrator wind-up), but tracking performance degrades for fast-moving references.

## Project Structure

```
Ball-and-Plate_System/
├── src/
│   ├── sim/
│   │   ├── physics.ts          # Physics simulation (RK4, dynamics)
│   │   ├── controller.ts       # PD controller with feedforward
│   │   └── reference.ts        # Reference generators (mouse, drawing)
│   ├── state/
│   │   └── store.ts            # Zustand state management
│   ├── components/
│   │   ├── CanvasView.tsx      # Canvas rendering component
│   │   ├── ChartView.tsx       # Angle chart visualization
│   │   └── ControlPanel.tsx    # UI controls
│   ├── utils/
│   │   └── math.ts             # Math utilities (filters, splines)
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Configuration

### Physics Parameters

Edit `src/sim/physics.ts` to modify:
- `g`: Gravitational acceleration
- `k`: Ball acceleration coefficient
- `plateSize`: Size of the square plate
- `ballRadius`: Visual radius (doesn't affect dynamics)
- `boundaryRestitution`: Coefficient for collision damping
- `dragCoefficient`: Air resistance (when enabled)

### Default Controller Gains

Edit `src/sim/controller.ts` to modify default gains and presets.

## Development

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

### Type Checking

TypeScript is configured with strict mode. All code is type-safe with no `any` types.

## Performance

- **Physics Timestep**: 0.0025s (400 Hz) for numerical stability
- **Rendering**: 60 fps via `requestAnimationFrame`
- **Substeps**: Automatic substepping to handle variable frame rates
- **Max Substeps**: 20 per frame to prevent spiral of death

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires support for:
- Canvas 2D API
- ES2020
- requestAnimationFrame
- High DPI displays (automatic scaling)

## Known Limitations

- Drawing mode uses simplified linear spline (true cubic spline would require additional library)
- No process/sensor noise simulation in this version
- Mouse velocity estimation uses simple numerical differentiation
- Manual control applies additive angles (not separate mode by default)

## Future Enhancements

Potential additions:
- PID control with anti-windup
- State observer/Kalman filter
- LQR or MPC controllers
- 3D visualization with Three.js
- Noise and disturbance injection
- Data export (CSV, JSON)
- Multiple ball simulation
- Obstacle avoidance

## License

MIT License - feel free to use for educational or commercial purposes.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## References

1. Åström, K. J., & Murray, R. M. (2008). *Feedback Systems: An Introduction for Scientists and Engineers*
2. Franklin, G. F., Powell, J. D., & Emami-Naeini, A. (2019). *Feedback Control of Dynamic Systems*
3. [Ball and Plate Control](https://en.wikipedia.org/wiki/Ball_and_plate) - Wikipedia

## Acknowledgments

Built with modern web technologies:
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://github.com/pmndrs/zustand) - State management

---

**Questions or Issues?** Open an issue on GitHub or contact the maintainer.