import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  eyebrow,
}) => (
  <div className="page-heading">
    <div className="min-w-0">
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h2 className="page-title">{title}</h2>
      {description && <p className="page-description">{description}</p>}
    </div>
    {action && <div className="page-heading-action">{action}</div>}
  </div>
);
