---
layout: about
title: about
permalink: /
# subtitle: <a href='#'>Affiliations</a>. Address. Contacts. Motto. Etc.

profile:
  align: right
  image: Isaac_1.jpg
  image_circular: false # crops the image to make it circular
  # more_info: >
  #   <p>555 your office number</p>
  #   <p>123 your address street</p>
  #   <p>Your City, State 12345</p>

news: false # includes a list of news items
selected_papers: false # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page
---

I am a scientist and engineer by training, with expertise in rheology, soft matter, computational physics, and experimental microfluidics. I'm broadly interested in applying computational and theoretical modelling to better understand and model physical processes in micro- and meso-scale systems. I did my PhD at Monash University, Australia, supervised by [Ravi Jagadeshan](https://research.monash.edu/en/persons/ravi-jagadeeshan) and [Alison Rodger](https://chemistry.anu.edu.au/people/prof-alison-rodger), followed by postdocs at MIT working with [Gareth McKinley](https://nnf.mit.edu/people/alumni) and [Maggie Qi](https://qigroup.mit.edu/team/), and at the University of Lausanne working with [Pietro de Anna](https://pietrodeanna.org/pda/). 

On this website, you can view information about [projects]({% link _pages/projects.md %}) I've worked on, including simplified overviews of papers I've published. I also have several [teaching]({% link _pages/teaching.md %}) resources available for classes that I've demonstrated and lectured for throughout my PhD and postdoc. 


<div class="project-slideshow" id="projShow">
  <div class="slides">
    {% assign sorted_projects = site.projects | sort: "importance" %}
    {% for project in sorted_projects %}
      {% if project.img %}
        <div class="slide{% if forloop.first %} active{% endif %}">
          <a href="{{ project.url | relative_url }}">
            {% if project.img contains '.webm' or project.img contains '.mp4' %}
              <video class="img-fluid rounded z-depth-1" width="100%" muted loop playsinline preload="none">
                <source src="{{ project.img | relative_url }}" type="video/webm">
              </video>
            {% else %}
              {% include figure.liquid loading="eager" path=project.img class="img-fluid rounded z-depth-1" %}
            {% endif %}
            <p class="slide-cap">{{ project.title }}</p>
          </a>
        </div>
      {% endif %}
    {% endfor %}
  </div>

  <button class="nav prev" onclick="moveSlide('projShow',-1)">&#10094;</button>
  <button class="nav next" onclick="moveSlide('projShow',1)">&#10095;</button>
  <div class="dots"></div>
</div>

<style>
.project-slideshow { position: relative; max-width: 640px; margin: 1.5rem auto; }
.project-slideshow .slide { display: none; }
.project-slideshow .slide.active { display: block; }
.project-slideshow .slide a { text-decoration: none; color: inherit; }
.project-slideshow .slide figure { margin: 0; }
/* Fixed frame: every slide is the same size; images are letterboxed, not cropped */
.project-slideshow .slide img,
.project-slideshow .slide video {
  width: 100%; aspect-ratio: 16 / 10; object-fit: contain;
  background: var(--global-bg-color); display: block;
}
.project-slideshow .slide-cap {
  text-align: center; font-size: 0.95rem; margin-top: 0.5rem; opacity: 0.85;
  min-height: 2.8em; /* room for two lines, so long titles don't shift the dots */
}
.project-slideshow .nav {
  position: absolute; top: 40%; transform: translateY(-50%);
  background: rgba(0,0,0,0.4); color: #fff; border: none;
  padding: 0.4rem 0.7rem; cursor: pointer; border-radius: 6px; font-size: 1.1rem;
}
.project-slideshow .nav.prev { left: 8px; }
.project-slideshow .nav.next { right: 8px; }
.project-slideshow .dots { text-align: center; margin-top: 0.6rem; }
.project-slideshow .dot {
  height: 9px; width: 9px; margin: 0 4px; border-radius: 50%;
  background: #bbb; display: inline-block; cursor: pointer;
}
.project-slideshow .dot.active { background: #666; }
</style>

<script>
function goToSlide(show, n){
  const slides = show.querySelectorAll('.slide');
  const dots = show.querySelectorAll('.dot');
  slides.forEach((s, i) => {
    s.classList.toggle('active', i === n);
    const v = s.querySelector('video');
    if (v){ if (i === n){ v.play().catch(()=>{}); } else { v.pause(); } }
    if (dots[i]) dots[i].classList.toggle('active', i === n);
  });
  show.dataset.cur = n;
}
function moveSlide(id, dir){
  const show = document.getElementById(id);
  const total = show.querySelectorAll('.slide').length;
  const cur = parseInt(show.dataset.cur || '0', 10);
  goToSlide(show, (cur + dir + total) % total);
  restartTimer(show);
}
function restartTimer(show){
  if (show._timer) clearInterval(show._timer);
  show._timer = setInterval(() => moveSlideAuto(show), 4000);
}
function moveSlideAuto(show){
  const total = show.querySelectorAll('.slide').length;
  const cur = parseInt(show.dataset.cur || '0', 10);
  goToSlide(show, (cur + 1) % total);
}
document.addEventListener('DOMContentLoaded', () => {
  const show = document.getElementById('projShow');
  const slides = show.querySelectorAll('.slide');
  const dots = show.querySelector('.dots');
  slides.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.onclick = () => { goToSlide(show, i); restartTimer(show); };
    dots.appendChild(d);
  });
  show.dataset.cur = '0';
  restartTimer(show);
  show.addEventListener('mouseenter', () => clearInterval(show._timer));
  show.addEventListener('mouseleave', () => restartTimer(show));
});
</script>

<!-- <div style="max-width: 560px;">
  <figure>
    <iframe width="560" height="315" 
      src="https://www.youtube.com/embed/AVa0PXonQjg?si=q1MrEF5ufQx-9OoX" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
    <figcaption>My winning entry to the <a href="https://www.societyofrheology.org/">Society of Rheology</a> Gallery of Rheology video showcase at the Santa Fe 2025 meeting.</figcaption>
  </figure>
</div> -->

<!-- <div style="max-width: 560px;">
  <figure>
    <video width="100%" controls>
      <source src="{{ site.baseurl }}/assets/video/SoR_GoR_2025_Isaac_Pincus.webm#t=11" type="video/webm">
      Your browser doesn't support video playback.
    </video>
     <figcaption>My winning entry to the <a href="https://www.societyofrheology.org/">Society of Rheology</a> Gallery of Rheology video showcase at the Santa Fe 2025 meeting.</figcaption>
  </figure>
</div> -->

<!-- Here you will find information 

Write your biography here. Tell the world about yourself. Link to your favorite [subreddit](http://reddit.com). You can put a picture in, too. The code is already in, just name your picture `prof_pic.jpg` and put it in the `img/` folder.

Put your address / P.O. box / other info right below your picture. You can also disable any of these elements by editing `profile` property of the YAML header of your `_pages/about.md`. Edit `_bibliography/papers.bib` and Jekyll will render your [publications page](/al-folio/publications/) automatically.

Link to your social media connections, too. This theme is set up to use [Font Awesome icons](https://fontawesome.com/) and [Academicons](https://jpswalsh.github.io/academicons/), like the ones below. Add your Facebook, Twitter, LinkedIn, Google Scholar, or just disable all of them. -->
