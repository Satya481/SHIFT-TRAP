// game/particles.js
// High-performance particle & visual FX system for SHIFT//TRAP

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.afterimages = [];
    this.floatingTexts = [];
    this.telegraphs = [];
  }

  reset() {
    this.particles = [];
    this.afterimages = [];
    this.floatingTexts = [];
    this.telegraphs = [];
  }

  // --- PARTICLE CREATION ---

  addFootstep(x, y, dir = 1) {
    if (Math.random() > 0.45) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + 2,
      vx: -dir * (0.8 + Math.random() * 1.2),
      vy: -(0.3 + Math.random() * 0.8),
      size: 2.5 + Math.random() * 2,
      color: "rgba(244, 240, 232, 0.45)",
      life: 1,
      decay: 0.05 + Math.random() * 0.04,
      gravity: 0.05,
    });
  }

  addJumpPuff(x, y) {
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI * 0.8 + Math.random() * Math.PI * 1.4;
      const speed = 1.2 + Math.random() * 2.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        size: 3 + Math.random() * 2.5,
        color: "rgba(124, 255, 107, 0.65)",
        life: 1,
        decay: 0.04 + Math.random() * 0.03,
        gravity: 0.08,
      });
    }
  }

  addLandPuff(x, y, width, velocityY) {
    const count = Math.min(14, Math.max(5, Math.floor(velocityY * 1.2)));
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.particles.push({
        x: x + width / 2 + dir * (Math.random() * 6),
        y: y,
        vx: dir * (1.5 + Math.random() * 3.5),
        vy: -(0.5 + Math.random() * 1.8),
        size: 3 + Math.random() * 2.5,
        color: "rgba(244, 240, 232, 0.55)",
        life: 1,
        decay: 0.045 + Math.random() * 0.035,
        gravity: 0.12,
      });
    }
  }

  addDashGhost(player, color = "rgba(124, 255, 107, 0.5)") {
    this.afterimages.push({
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
      color: color,
      alpha: 0.65,
      decay: 0.055,
      scaleX: player.scaleX || 1,
      scaleY: player.scaleY || 1,
    });
  }

  addDeathBurst(x, y, width, height) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const colors = ["#ff4d3d", "#ff786b", "#f4f0e8", "#ff2a17", "#ff9e94"];

    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * width,
        y: cy + (Math.random() - 0.5) * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.02 + Math.random() * 0.025,
        gravity: 0.22,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        bounce: true,
      });
    }
  }

  addPortalParticle(exit) {
    if (Math.random() > 0.4) return;
    const cx = exit.x + exit.width / 2;
    const cy = exit.y + exit.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const dist = 32 + Math.random() * 28;

    this.particles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      targetX: cx,
      targetY: cy,
      vx: 0,
      vy: 0,
      size: 1.5 + Math.random() * 2.5,
      color: Math.random() > 0.3 ? "#7cff6b" : "#b8ffad",
      life: 1,
      decay: 0.028,
      isPortal: true,
    });
  }

  addFloatingText(text, x, y, color = "#7cff6b") {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.2,
      alpha: 1,
      life: 1,
      decay: 0.02,
      color,
    });
  }

  addTelegraph(x, y, width, height, duration = 30, type = "spike") {
    this.telegraphs.push({
      x,
      y,
      width,
      height,
      maxDuration: duration,
      timer: duration,
      type,
    });
  }

  addWallSlideSparks(x, y, wallDir) {
    if (Math.random() > 0.45) return;
    this.particles.push({
      x: x + (wallDir > 0 ? 0 : 4),
      y: y + Math.random() * 12,
      vx: -wallDir * (1 + Math.random() * 2),
      vy: -(0.5 + Math.random() * 1.5),
      size: 2 + Math.random() * 1.5,
      color: Math.random() > 0.4 ? "#ffd700" : "#ff9e94",
      life: 0.8,
      decay: 0.08,
      gravity: 0.15,
    });
  }

  addDashRingBurst(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        color: "#56b4f5",
        life: 1,
        decay: 0.05,
      });
    }
  }

  addDataCubeSparkle(x, y) {
    if (Math.random() > 0.35) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 18,
      y: y + (Math.random() - 0.5) * 18,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(0.8 + Math.random() * 1.2),
      size: 2 + Math.random() * 2,
      color: "#b066ff",
      life: 1,
      decay: 0.04,
    });
  }

  addBossLaserSparks(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 2.5 + Math.random() * 2,
        color: "#ff4d3d",
        life: 0.9,
        decay: 0.06,
      });
    }
  }

  // --- UPDATE ---

  update(delta) {
    // 1. Standard particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isPortal) {
        // Swirl toward center
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.x += (dx * 0.06 - dy * 0.08) * delta;
        p.y += (dy * 0.06 + dx * 0.08) * delta;
      } else {
        if (p.gravity) p.vy += p.gravity * delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        if (p.vrot) p.rot += p.vrot * delta;

        // Bounce off bottom floor
        if (p.bounce && p.y > 480) {
          p.y = 480;
          p.vy = -p.vy * 0.5;
          p.vx *= 0.8;
        }
      }
    }

    // 2. Dash afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const img = this.afterimages[i];
      img.alpha -= img.decay * delta;
      if (img.alpha <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    // 3. Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= t.decay * delta;
      t.y += t.vy * delta;
      t.alpha = Math.max(0, t.life);
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 4. Telegraph countdowns
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tel = this.telegraphs[i];
      tel.timer -= delta;
      if (tel.timer <= 0) {
        this.telegraphs.splice(i, 1);
      }
    }
  }

  // --- DRAW ---

  draw(ctx) {
    ctx.save();

    // 1. Draw Telegraph Warning Projections
    for (const tel of this.telegraphs) {
      const progress = 1 - Math.max(0, tel.timer) / tel.maxDuration;
      ctx.save();

      // Flashing holographic grid
      const pulse = 0.4 + 0.6 * Math.sin(Date.now() * 0.025);
      ctx.strokeStyle = `rgba(255, 77, 61, ${0.4 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      // Vertical hazard beacon
      ctx.beginPath();
      ctx.moveTo(tel.x + tel.width / 2, 0);
      ctx.lineTo(tel.x + tel.width / 2, tel.y + tel.height);
      ctx.stroke();

      // Trap bounding zone fill
      ctx.fillStyle = `rgba(255, 77, 61, ${0.15 + progress * 0.25})`;
      ctx.fillRect(tel.x, tel.y, tel.width, tel.height);

      ctx.strokeStyle = "#ff4d3d";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(tel.x, tel.y, tel.width, tel.height);

      // Warning text badge
      ctx.fillStyle = "#ff4d3d";
      ctx.font = "800 9px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("! LOCK", tel.x + tel.width / 2, tel.y - 8);

      // Progress bar underneath
      ctx.fillStyle = "rgba(255, 77, 61, 0.4)";
      ctx.fillRect(tel.x, tel.y + tel.height + 4, tel.width, 3);
      ctx.fillStyle = "#ff4d3d";
      ctx.fillRect(tel.x, tel.y + tel.height + 4, tel.width * progress, 3);

      ctx.restore();
    }

    // 2. Dash Afterimages
    for (const img of this.afterimages) {
      ctx.save();
      ctx.globalAlpha = img.alpha;
      ctx.fillStyle = img.color;
      ctx.fillRect(img.x, img.y, img.width, img.height);

      // Scanline over ghost
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(img.x, img.y + img.height / 2);
      ctx.lineTo(img.x + img.width, img.y + img.height / 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Regular particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;

      if (p.rot) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Floating text popups
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.font = "800 12px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    ctx.restore();
  }
}
