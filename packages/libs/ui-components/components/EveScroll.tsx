import React, {
  HTMLAttributes,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import "../styles-ui.css";

interface FakeScrollbarProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  maxHeight: string;
  classStyles?: string;
}

const EveScroll: React.FC<FakeScrollbarProps> = ({
  children,
  maxHeight,
  classStyles,
  ...props
}) => {
  const { id } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRatioRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollVisible, setScrollVisible] = useState(false);
  const [scrollHeight, setScrollHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current && contentRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;

      setScrollVisible(contentHeight > containerHeight);
      setScrollHeight((containerHeight / contentHeight) * containerHeight);
    }
  }, [children]);

  const handleScroll = () => {
    if (containerRef.current && contentRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;

      const scrollTop = containerRef.current.scrollTop;
      const scrollTopRatio = scrollTop / contentHeight;
      const newScrollTop = scrollTopRatio * containerHeight;

      contentRef.current.scrollTop = newScrollTop;
    }
  };

  const handleContentScroll = () => {
    if (containerRef.current && contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;

      const scrollTop = contentRef.current.scrollTop;
      const scrollTopRatio = scrollTop / contentHeight;

      // Synchronize scroll position between the custom scrollbar and the actual scroll position of the content.
      scrollTopRatioRef.current = scrollTopRatio;
    }
  };

  const contentWidth = scrollVisible ? `w-[calc(100%-0.5rem)]` : `w-full`;

  return (
    <div
      className="Eve-Scroll-Container"
      ref={containerRef}
      style={{ maxHeight }}
      onScroll={handleScroll}
      id={id}
    >
      <div
        className={`Eve-Scroll-Content ${contentWidth} ${
          classStyles ? classStyles : ""
        }`}
        ref={contentRef}
        onScroll={handleContentScroll}
      >
        {children}
      </div>
      {scrollVisible && (
        <div className="Eve-Scrollbar">
          <div
            className="Eve-Scroll-Thumb"
            style={{
              height: `${scrollHeight}px`,
              top: `${scrollTopRatioRef.current * 100}%`,
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default EveScroll;
