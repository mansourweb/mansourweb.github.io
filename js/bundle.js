(function () {

  'use strict';

  /**
   * Variables
   */

  // DOM elements
  const body = document.body;
  const nav = document.querySelector('[data-nav]');
  const navItems = nav.querySelectorAll('a');
  const main = document.querySelector('[data-main-wrapper]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  let revealItems = document.querySelectorAll('[data-reveal]');
  let parallaxItems = document.querySelectorAll('[data-parallax]');

  // Classes
  const activeClass = 'is-active';
  const inactiveClass = 'is-inactive';

  // Flags
  let isPopstate = false;

  // Configs
  const intersectionConfig = {
    rootMargin: '50px 0px',
    threshold: 0.01
  };

  const parallaxConfig = {
    speed: 0.3
  }

  // Request Animation Frame
  window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  })();


  /**
   * Methods
   */


  const getClosest = (elem, selector) => {

    // Element.matches() polyfill
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function (s) {
          var matches = (this.document || this.ownerDocument).querySelectorAll(s),
            i = matches.length;
          while (--i >= 0 && matches.item(i) !== this) { }
          return i > -1;
        };
    }

    // Get closest match
    for (; elem && elem !== document; elem = elem.parentNode) {
      if (elem.matches(selector)) return elem;
    }

    return null;

  }


  const debounce = (fn) => {

    // Setup a timer
    var timeout;

    // Return a function to run debounced
    return function () {

      // Setup the arguments
      var context = this;
      var args = arguments;

      // If there's a timer, cancel it
      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }

      // Setup the new requestAnimationFrame()
      timeout = window.requestAnimationFrame(function () {
        fn.apply(context, args);
      });

    }
  }


  // Remove quotes from string
  const removeQuotes = (string) => {
    if (typeof string === 'string' || string instanceof String) {
      string = string.replace(/^['"]+|\s+|\\|(;\s?})+|['"]$/g, '');
    }
    return string;
  }


  // Check active CSS Media Query
  const checkMedia = () => {
    var media = window.getComputedStyle(body,':after').getPropertyValue('content');
    return removeQuotes(media);
  }


  // Apply a CSS animation to an element
  const animate = (elem, animation, hide, callback) => {

    // If there's no element or animation, do nothing
    if (!elem || !animation) return;

    // Remove the [hidden] attribute
    elem.removeAttribute('hidden');

    // Apply the animation
    elem.classList.add(animation);

    // Detect when the animation ends
    elem.addEventListener('animationend', function endAnimation(event) {

      // Remove the animation class
      elem.classList.remove(animation);

      // If the element should be hidden, hide it
      if (hide) {
        elem.setAttribute('hidden', 'true');
      }

      // Remove this event listener
      elem.removeEventListener('animationend', endAnimation, false);

      if (callback) {
        // Fire callback function
        callback();
      }

    }, false);
  }


  const getContent = (url, method) => {

    // Create the XHR request
    let request = new XMLHttpRequest();

    // Return it as a Promise
    return new Promise(function (resolve, reject) {

      // Setup our listener to process compeleted requests
      request.onreadystatechange = function () {

        // Only run if the request is complete
        if (request.readyState !== 4) return;

        // Process the response
        if (request.status >= 200 && request.status < 300) {
          // If successful
          resolve(request);
        } else {
          // If failed
          reject({
            status: request.status,
            statusText: request.statusText
          });
        }

      };

      // Setup our HTTP request
      request.open(method || 'GET', url, true);

      // Send the request
      request.send();

    });
  }


  const loadContent = (url) => {
    getContent(url)

      // Success
      .then(function (response) {

        // Create element for data
        const wrapper = document.createElement('div');
        wrapper.innerHTML = response.responseText;

        // Get target content
        const oldContent = document.querySelector('[data-main-content]');
        const newContent = wrapper.querySelector('[data-main-content]');

        // Update page title
        const title = wrapper.querySelector('title').textContent;
        document.title = title;

        // Update session history
        updateHistory(title, url);

        // Animate prev page content out of viewport
        animate(oldContent, 'fadeOutUp', true, function () {
          
          // Remove prev page content
          oldContent.parentNode.removeChild(oldContent);

          // Reset navigation/toggle if active
          if (nav.getAttribute('aria-hidden') === 'false' && checkMedia() === 'small') {
            toggleMobileNavigation();
          }

          // Insert new page content
          main.appendChild(newContent);

          // Scroll to top of window
          if (!isPopstate) {
            window.scrollTo(0, 0);
          }

          // Reset popstate event flag
          isPopstate = false;

          

        });

        // Animate new page content into viewport
        animate(newContent, 'fadeInUp', false, function () {
            
          // Re-init IntersectionObserver items
          revealItems = newContent.querySelectorAll('[data-reveal]');
          observer = new IntersectionObserver(onIntersection, intersectionConfig);
          revealItems.forEach(item => {
            observer.observe(item);
          });

          // Re-init parallax items
          parallaxItems = document.querySelectorAll('[data-parallax]');
          parallaxItems.forEach(item => {
            item.style.transform = 'translateY( calc( var(--scrollparallax) * 1px ) )';
          });
        });

        // Update navigation with active item
        setActiveNavItem(url);
      })

      // Error
      .catch(function (error) {
        console.log('Something went wrong', error);
      });
  }


  const updateHistory = (title, url) => {
    if (isPopstate) {
      history.replaceState(null, title, url);
    } else {
      history.pushState(null, title, url);
    }
  }


  const setActiveNavItem = (url) => {
    navItems.forEach(elem => {
      if (elem.href === url) {
        elem.classList.add(activeClass);
      } else {
        elem.classList.remove(activeClass);
      }
    });
  }


  const toggleMobileNavigation = (e) => {
    
    // Update Nav Toggle state
    if (navToggle.getAttribute('aria-expanded') === 'false') {
      navToggle.setAttribute('aria-expanded', 'true');
    } else {
      navToggle.setAttribute('aria-expanded', 'false');
    }
    
    // Show/hide navigation and disable scrolling
    if (nav.getAttribute('aria-hidden') === 'true') {
      nav.setAttribute('aria-hidden', 'false');
      body.classList.add(inactiveClass);
    } else {
      nav.setAttribute('aria-hidden', 'true');
      body.classList.remove(inactiveClass);
    }
  }


  const setScrollParallax = () => {
    parallaxItems.forEach(item => {
      item.style.setProperty("--scrollparallax", (document.body.scrollTop || document.documentElement.scrollTop) * parallaxConfig.speed);
    });
  }


  const onIntersection = (entries) => {
    
    // Loop through the entries
    entries.forEach(entry => {

      const item = entry.target;
      
      // Check if item is in the viewport
      if (entry.intersectionRatio > 0) {
        item.classList.add('is-visible');
      }

    });
  }


  const scrollEventHandler = (e) => {
    window.requestAnimationFrame( setScrollParallax );
  }


  const resizeEventHandler = (e) => {
    if (nav.getAttribute('aria-hidden') === 'false' && checkMedia() === 'small') {
      nav.setAttribute('aria-hidden', 'true');
      navToggle.setAttribute('aria-expanded', 'false');
      body.classList.remove(inactiveClass);
    }
  }

  
  const clickEventHandler = (e) => {

    // Get target element
    let el = e.target;

    // Nav toggle
    if (getClosest(el, '[data-nav-toggle]')) {
      toggleMobileNavigation();
    }

    // Page links
    if (getClosest(el, '[data-page-link]')) {

      // Return if meta key is active
      if (e.metaKey) return;

      // Prevent default anchor behavior
      e.preventDefault();

      // Get href value
      let url = getClosest(el, '[data-page-link]').href;

      // Bail if the current page is same as requested page
      if (url === window.location.href) return;

      // Kick off request
      loadContent(url);
    }


    // In-page links
    if (e.target.origin === location.origin && !e.target.matches('[data-page-link]')) {

      // Prevent default link behavior
      e.preventDefault();

      // Get target selector
      let targetSelector = e.target.href.split('#').pop();
      
      // Get target element
      let targetElem = document.getElementById(targetSelector);

      // Scroll to top
      targetElem.scrollIntoView({ 
        behavior: 'smooth',
      });
    }
  }


  const popstateEventHandler = (e) => {

    // Get URL of page
    let url = location.href;

    // Update event flag
    isPopstate = true;

    // Fire XHR function
    loadContent(url);
  }


  const keydownEventHandler = (e) => {

    // Get URL of page
    let key = e.key;

    if (key === "Escape" || key === "Esc") {
      if (nav.getAttribute('aria-hidden') === 'false') {
        toggleMobileNavigation();
      }
    }
  }


  /**
   * Events/APIs/init
   */


  // Update Javascript status state on document
  document.documentElement.className = 'js';


  // Create proper ititial item for session history
  history.replaceState(null, document.title, location.href);


  // Set initial nav state
  if (checkMedia() === 'small') {
    nav.setAttribute('aria-hidden', 'true');
  } else {
    nav.setAttribute('aria-hidden', 'false');
  }
  
  // Listen for scroll events
  window.addEventListener('scroll', debounce(scrollEventHandler), false);


  // Listen for resize events
  window.addEventListener('resize', debounce(resizeEventHandler), false);


  // Listen for click events
  window.addEventListener('click', clickEventHandler, false);


  // Listen for popstate events
  window.addEventListener('popstate', popstateEventHandler, false);


  // Listen for keydown events
  window.addEventListener('keydown', keydownEventHandler, false);


  // Observe reveal items
  let observer = new IntersectionObserver(onIntersection, intersectionConfig);
  revealItems.forEach(item => {
    observer.observe(item);
  });


  // Set Parallax Items
  parallaxItems.forEach(item => {
    item.style.transform = 'translateY( calc( var(--scrollparallax) * 1px ) )';
  });

})();