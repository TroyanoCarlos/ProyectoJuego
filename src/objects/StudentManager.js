import Phaser from 'phaser';
import { BUILDING_TYPES } from '../data/BuildingTypes.js';
import { DROP_SPOTS } from '../data/DropSpots.js';

const STUDENT_TYPES = Array.from({ length: 15 }, (_, index) => ({
  texture: `student-${index + 1}`,
  radius: 16,
  width: 100,
  height: 100,
}));

export default class StudentManager {
  constructor(scene, state, { worldW, worldH, spotPts }) {
    this.scene = scene;
    this.state = state;
    this.worldW = worldW;
    this.worldH = worldH;
    this.spotPts = spotPts;
    this.students = [];
  }

  sync() {
    const placed = Object.keys(this.state.placedBuildings);

    placed.forEach((spotId, buildingIndex) => {
      const spot = DROP_SPOTS.find(s => s.id === parseInt(spotId));
      const bData = this.state.placedBuildings[spotId];
      if (!spot) return;

      const desiredCount = bData?.students ?? 0;
      const currentCount = this.students.filter(s => s.spotId === spotId && s.gfx?.active).length;
      const count = Math.max(0, desiredCount - currentCount);

      for (let i = 0; i < count; i++) {
        this._createForSpot(spot, spotId, buildingIndex);
      }
    });
  }

  update(delta = 16) {
    const blockedAreas = this._allBlockedAreas();
    const dt = delta / 1000;

    this.students.forEach(student => {
      const gfx = student.gfx;
      if (!gfx?.active) return;

      student.blockedAreas = blockedAreas;
      student.repathCooldown = Math.max(0, student.repathCooldown - delta);

      if (this._pointInBlockedArea(student, gfx.x, gfx.y)) {
        const safePoint = this._randomPointInPolygon(
          student.area,
          this.students.filter(other => other !== student),
          student.blockedAreas
        );
        gfx.setPosition(safePoint.x, safePoint.y);
        student.waypointIndex = this._nearestWaypointIndex(safePoint, student.waypoints);
        student.target = this._pickTarget(student);
        return;
      }

      if (!student.target || Phaser.Math.Distance.Between(gfx.x, gfx.y, student.target.x, student.target.y) < 6) {
        student.target = this._pickTarget(student);
      }

      const crowded = this._crowdingCount(student) >= 3;
      const moved = Phaser.Math.Distance.Between(gfx.x, gfx.y, student.lastX, student.lastY);
      student.stuckTime = moved < 1 ? student.stuckTime + delta : 0;
      student.lastX = gfx.x;
      student.lastY = gfx.y;

      if (student.repathCooldown <= 0 && (this._wouldCollide(student) || crowded || student.stuckTime > 900)) {
        student.target = this._pickTarget(student, crowded ? 3 : 1);
        student.repathCooldown = 450;
        student.stuckTime = 0;
      }

      const angle = Phaser.Math.Angle.Between(gfx.x, gfx.y, student.target.x, student.target.y);
      const separation = this._separationVector(student);
      const next = {
        x: gfx.x + (Math.cos(angle) * student.speed + separation.x) * dt,
        y: gfx.y + (Math.sin(angle) * student.speed + separation.y) * dt,
      };

      if (
        Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(student.area), next.x, next.y) &&
        !this._pointInBlockedArea(student, next.x, next.y)
      ) {
        if (typeof gfx.setFlipX === 'function') gfx.setFlipX(next.x < gfx.x);
        gfx.setPosition(next.x, next.y);
        gfx.setDepth(this._depthForPosition(gfx.x, gfx.y, student));
      } else {
        student.target = this._pickTarget(student);
      }
    });
  }

  _createForSpot(spot, spotId, buildingIndex) {
    const area = this._walkAreaAroundSpot(spot);
    const blockedAreas = this._allBlockedAreas();
    const t = STUDENT_TYPES[Math.floor(Math.random() * STUDENT_TYPES.length)];
    const start = this._randomPointInPolygon(area, this.students, blockedAreas);
    const buildingDepth = BUILDING_TYPES.find(type => type.id === spot.typeId)?.renderDepth ?? 2;

    const gfx = this.scene.add.image(start.x, start.y, t.texture)
      .setDisplaySize(t.width, t.height)
      .setDepth(buildingDepth + 0.1);

    const student = {
      spotId,
      gfx,
      area,
      blockedAreas,
      waypoints: area,
      waypointIndex: this._nearestWaypointIndex(start, area),
      radius: t.radius,
      speed: Phaser.Math.Between(9, 16),
      target: null,
      repathCooldown: 0,
      stuckTime: 0,
      lastX: start.x,
      lastY: start.y,
      buildingIndex,
      buildingDepth,
      depthSplitY: spot.y + 35,
    };
    student.target = this._pickTarget(student);
    this.students.push(student);
  }

  _walkAreaAroundSpot(spot) {
    const base = this.spotPts(spot);
    const cx = spot.x;
    const cy = spot.y;
    const padding = 95;
    const clamp = p => ({
      x: Phaser.Math.Clamp(Math.round(p.x), 40, this.worldW - 40),
      y: Phaser.Math.Clamp(Math.round(p.y), 120, this.worldH - 40),
    });

    const expanded = base.map(p => {
      const v = new Phaser.Math.Vector2(p.x - cx, p.y - cy);
      if (v.length() === 0) return clamp(p);
      v.setLength(v.length() + padding);
      return clamp({ x: cx + v.x, y: cy + v.y });
    });

    return [
      expanded[0],
      clamp({ x: (expanded[0].x + expanded[1].x) / 2, y: (expanded[0].y + expanded[1].y) / 2 }),
      expanded[1],
      clamp({ x: (expanded[1].x + expanded[2].x) / 2, y: (expanded[1].y + expanded[2].y) / 2 }),
      expanded[2],
      clamp({ x: (expanded[2].x + expanded[3].x) / 2, y: (expanded[2].y + expanded[3].y) / 2 }),
      expanded[3],
      clamp({ x: (expanded[3].x + expanded[0].x) / 2, y: (expanded[3].y + expanded[0].y) / 2 }),
    ];
  }

  _blockedAreasForSpot(spot) {
    const type = BUILDING_TYPES.find(t => t.id === spot.typeId);
    const spriteW = type?.displaySize?.width ?? 300;
    const spriteH = type?.displaySize?.height ?? 300;
    const bodyW = spriteW * 0.62;
    const bodyH = spriteH * 0.52;
    const cx = spot.x;
    const cy = spot.y - spriteH * 0.08;
    const spriteBody = new Phaser.Geom.Polygon([
      { x: cx, y: cy - bodyH },
      { x: cx + bodyW, y: cy },
      { x: cx, y: cy + bodyH },
      { x: cx - bodyW, y: cy },
    ]);

    return [
      new Phaser.Geom.Polygon(this.spotPts(spot)),
      spriteBody,
    ];
  }

  _allBlockedAreas() {
    return Object.keys(this.state.placedBuildings).flatMap(spotId => {
      const spot = DROP_SPOTS.find(s => s.id === parseInt(spotId));
      return spot ? this._blockedAreasForSpot(spot) : [];
    });
  }

  _pointInBlockedArea(student, x, y) {
    return this._pointInAnyBlockedArea(student.blockedAreas, x, y);
  }

  _pointInAnyBlockedArea(blockedAreas, x, y) {
    return blockedAreas?.some(area => Phaser.Geom.Polygon.Contains(area, x, y)) ?? false;
  }

  _wouldCollide(student) {
    const minDist = student.radius * 2 + 10;
    return this.students.some(other => {
      if (other === student || !other.gfx?.active) return false;
      return Phaser.Math.Distance.Between(student.gfx.x, student.gfx.y, other.gfx.x, other.gfx.y) < minDist;
    });
  }

  _crowdingCount(student) {
    return this.students.filter(other => {
      if (other === student || !other.gfx?.active) return false;
      return Phaser.Math.Distance.Between(student.gfx.x, student.gfx.y, other.gfx.x, other.gfx.y) < 54;
    }).length;
  }

  _separationVector(student) {
    const force = new Phaser.Math.Vector2(0, 0);
    this.students.forEach(other => {
      if (other === student || !other.gfx?.active) return;
      const dist = Phaser.Math.Distance.Between(student.gfx.x, student.gfx.y, other.gfx.x, other.gfx.y);
      if (dist <= 0 || dist > 44) return;
      const away = new Phaser.Math.Vector2(student.gfx.x - other.gfx.x, student.gfx.y - other.gfx.y)
        .normalize()
        .scale((44 - dist) * 2.4);
      force.add(away);
    });
    return force;
  }

  _depthForPosition(x, y, student) {
    let depth = student.buildingDepth + 0.1;

    Object.keys(this.state.placedBuildings).forEach(spotId => {
      const spot = DROP_SPOTS.find(s => s.id === parseInt(spotId));
      if (!spot) return;
      const type = BUILDING_TYPES.find(t => t.id === spot.typeId);
      const buildingDepth = type?.renderDepth ?? 2;
      const spriteW = type?.displaySize?.width ?? 300;
      const spriteH = type?.displaySize?.height ?? 300;
      const influenceW = spriteW * 0.7;
      const influenceTop = spot.y - spriteH * 0.6;
      const influenceBottom = spot.y + spriteH * 0.42;
      const nearX = Math.abs(x - spot.x) <= influenceW;
      const nearY = y >= influenceTop && y <= influenceBottom;

      if (!nearX || !nearY) return;
      depth = y < spot.y + 35 ? Math.min(depth, buildingDepth - 0.1) : Math.max(depth, buildingDepth + 0.1);
    });

    return depth;
  }

  _pickTarget(student, minWaypointStep = 1) {
    const dir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    const step = Phaser.Math.Between(minWaypointStep, Math.max(minWaypointStep, 3));
    const len = student.waypoints.length;
    student.waypointIndex = (student.waypointIndex + dir * step + len) % len;

    const point = student.waypoints[student.waypointIndex];
    const jitter = 18;
    const target = {
      x: Phaser.Math.Clamp(point.x + Phaser.Math.Between(-jitter, jitter), 40, this.worldW - 40),
      y: Phaser.Math.Clamp(point.y + Phaser.Math.Between(-jitter, jitter), 120, this.worldH - 40),
    };

    return this._pointInBlockedArea(student, target.x, target.y) ? point : target;
  }

  _nearestWaypointIndex(point, waypoints) {
    let bestIndex = 0;
    let bestDist = Infinity;
    waypoints.forEach((waypoint, index) => {
      const dist = Phaser.Math.Distance.Between(point.x, point.y, waypoint.x, waypoint.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  _randomPointInPolygon(points, avoid = [], blockedAreas = []) {
    const polygon = new Phaser.Geom.Polygon(points);
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    for (let i = 0; i < 40; i++) {
      const p = {
        x: Phaser.Math.Between(Math.ceil(minX), Math.floor(maxX)),
        y: Phaser.Math.Between(Math.ceil(minY), Math.floor(maxY)),
      };
      if (!Phaser.Geom.Polygon.Contains(polygon, p.x, p.y)) continue;
      if (this._pointInAnyBlockedArea(blockedAreas, p.x, p.y)) continue;
      const clear = avoid.every(student => {
        if (!student.gfx?.active) return true;
        return Phaser.Math.Distance.Between(p.x, p.y, student.gfx.x, student.gfx.y) > 24;
      });
      if (clear) return p;
    }

    const fallback = points.find(p => !this._pointInAnyBlockedArea(blockedAreas, p.x, p.y));
    return fallback ?? points[0];
  }
}
